import { resolveServerEnv, envString } from './serverEnv.js'

const CORS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODES = new Set(['chat', 'review', 'improve', 'draft'])
const MAX_MESSAGES = 24
const MAX_MESSAGE_CHARS = 12_000
const MAX_ARTICLES = 5
const MAX_ARTICLE_CHARS = 18_000
const DRAFT_FENCE_RE = /```icue-draft\s*([\s\S]*?)```/i

export function geminiApiKey(env = {}) {
  return envString(env, ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'])
}

export function geminiModel(env = {}) {
  // New AI Studio keys often cannot call gemini-2.5-flash / gemini-2.0-flash.
  // Prefer current lite Flash aliases that still accept free-tier keys.
  return envString(env, ['GEMINI_MODEL']) || 'gemini-3.5-flash-lite'
}

/** Preferred model first, then alternates when a model is unavailable / rate-limited. */
export function geminiModelCandidates(env = {}) {
  const preferred = geminiModel(env)
  const extras = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
  ]
  return [...new Set([preferred, ...extras])]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetrySameModel(err) {
  const http = err?.httpStatus
  return http === 429 || http === 503 || http === 500
}

function shouldTryNextModel(err) {
  const http = err?.httpStatus
  if (http === 404 || http === 429 || http === 503 || http === 500) return true
  if (err?.code === 'gemini_empty') return true
  const msg = String(err?.message || '').toLowerCase()
  return (
    msg.includes('no longer available')
    || msg.includes('not found')
    || msg.includes('high demand')
    || msg.includes('exceeded your current quota')
    || msg.includes('resource_exhausted')
  )
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
  }
}

function supabaseConfig(env) {
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '',
  }
}

function htmlToPlain(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text, max) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

async function verifyUser(accessToken, env) {
  const { url, anonKey } = supabaseConfig(env)
  if (!url || !anonKey) throw Object.assign(new Error('supabase_not_configured'), { status: 500 })
  if (!accessToken) throw Object.assign(new Error('unauthorized'), { status: 401 })

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) throw Object.assign(new Error('unauthorized'), { status: 401 })
  const user = await res.json()
  if (!user?.id) throw Object.assign(new Error('unauthorized'), { status: 401 })
  return user
}

async function fetchArticlesForUser(articleIds, accessToken, env) {
  const { url, anonKey } = supabaseConfig(env)
  if (!url || !anonKey || !articleIds.length) return []

  const ids = articleIds
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .slice(0, MAX_ARTICLES)
  if (!ids.length) return []

  // UUIDs are URL-safe; PostgREST `in` filter does not need quoting.
  const inList = ids.join(',')
  const select = 'id,slug,title,subtitle,content_html,status,language,category,author_name,sources'
  const res = await fetch(
    `${url}/rest/v1/articles?id=in.(${inList})&select=${select}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
  if (!res.ok) throw Object.assign(new Error(`article_fetch_${res.status}`), { status: 502 })
  return res.json()
}

function modeInstructions(mode) {
  switch (mode) {
    case 'review':
      return [
        'Mode: REVIEW.',
        'Read the attached article(s) carefully.',
        'Give a structured critique: strengths, weaknesses, factual/clarity risks, audience fit, and concrete next edits.',
        'Do not rewrite the whole article unless the user asks.',
      ].join(' ')
    case 'improve':
      return [
        'Mode: IMPROVE.',
        'Suggest specific improvements for the attached article(s).',
        'Prefer actionable rewrite snippets (headline options, lede rewrites, section edits) over vague advice.',
        'If proposing a full replacement draft, include an ```icue-draft fenced JSON block.',
      ].join(' ')
    case 'draft':
      return [
        'Mode: DRAFT.',
        'Write a new ICUE newsroom article from the user brief.',
        'Always end with an ```icue-draft JSON block containing title, subtitle, and content_html.',
        'content_html must use simple semantic HTML only: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>.',
        'Match the requested language. Default to Vietnamese if unclear.',
      ].join(' ')
    default:
      return [
        'Mode: CHAT.',
        'Help the author with reading, brainstorming, outlining, editing, or drafting.',
        'If you produce a full article draft the author could paste into the editor, include an ```icue-draft JSON block.',
      ].join(' ')
  }
}

function languageLabel(code) {
  const map = {
    vi: 'Vietnamese',
    en: 'English',
    de: 'German',
    fr: 'French',
    ko: 'Korean',
    ja: 'Japanese',
  }
  const normalized = String(code || '').split('-')[0].toLowerCase()
  return map[normalized] || code || 'Vietnamese'
}

function buildSystemPrompt({ mode, language, articles }) {
  const articleBlocks = articles.map((a, i) => {
    const body = truncate(htmlToPlain(a.content_html), MAX_ARTICLE_CHARS)
    return [
      `### Article ${i + 1}`,
      `id: ${a.id}`,
      `slug: ${a.slug || ''}`,
      `status: ${a.status || ''}`,
      `language: ${a.language || ''}`,
      `category: ${a.category || ''}`,
      `title: ${a.title || ''}`,
      `subtitle: ${a.subtitle || ''}`,
      `author_name: ${a.author_name || ''}`,
      `body:`,
      body || '(empty)',
    ].join('\n')
  })

  const langName = languageLabel(language)

  return [
    'You are ICUE Intelligent Editor — a focused editorial assistant for logged-in authors in Studio.',
    'ICUE publishes economics, urban planning, policy, and institute news for Vietnamese and international audiences.',
    'Be direct, concrete, and editorially useful. Avoid fluff.',
    'Never invent sources, quotes, statistics, or institutional claims. Flag uncertainty instead.',
    'When citing attached articles, refer to them by title.',
    `CRITICAL: Write your entire reply in ${langName} (UI locale code: ${language || 'vi'}).`,
    'Do not switch to English unless the UI locale is English.',
    'If you produce a draft, title/subtitle/content_html must also be in that same language, and set draft.language to the UI locale code.',
    modeInstructions(mode),
    'Draft JSON schema when used:',
    '{"title":"string","subtitle":"string|null","content_html":"string","language":"vi|en|de|fr|ko|ja","category":"general|..."}',
    articles.length
      ? `Attached articles (${articles.length}):\n\n${articleBlocks.join('\n\n')}`
      : 'No articles are attached. Ask for context if needed, or draft from the user brief.',
  ].join('\n\n')
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m?.role === 'model' || m?.role === 'assistant' ? 'model' : 'user',
      content: truncate(String(m?.content || '').trim(), MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content)
}

function parseDraft(text) {
  const match = text.match(DRAFT_FENCE_RE)
  if (!match) return { reply: text.trim(), draft: null }

  let draft = null
  try {
    const parsed = JSON.parse(match[1].trim())
    if (parsed && typeof parsed === 'object' && parsed.title && parsed.content_html) {
      draft = {
        title: String(parsed.title).trim(),
        subtitle: parsed.subtitle != null ? String(parsed.subtitle).trim() : '',
        content_html: String(parsed.content_html).trim(),
        language: parsed.language ? String(parsed.language).trim() : undefined,
        category: parsed.category ? String(parsed.category).trim() : undefined,
      }
    }
  } catch {
    draft = null
  }

  const reply = text.replace(DRAFT_FENCE_RE, '').trim()
  return { reply: reply || '', draft }
}

async function callGeminiOnce({ apiKey, model, system, messages }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = payload?.error?.message || `gemini_http_${res.status}`
    const status = res.status === 429 ? 429 : res.status >= 500 ? res.status : 502
    const code = res.status === 429 ? 'rate_limited' : res.status === 404 ? 'model_unavailable' : 'gemini_failed'
    throw Object.assign(new Error(msg), { status, code, model, httpStatus: res.status })
  }

  const parts = payload?.candidates?.[0]?.content?.parts
  const text = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
    : ''
  if (!text.trim()) {
    const finish = payload?.candidates?.[0]?.finishReason || 'unknown'
    throw Object.assign(new Error(`empty_response:${finish}`), {
      status: 502,
      code: 'gemini_empty',
      model,
      httpStatus: 200,
    })
  }
  return { text, model }
}

/**
 * Retry transient Gemini errors, then try alternate Flash models.
 * New API keys often get 404 on older Flash ids ("no longer available to new users").
 */
async function callGemini({ apiKey, models, system, messages }) {
  let lastErr = null

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex]
    const maxAttempts = 3

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await callGeminiOnce({ apiKey, model, system, messages })
      } catch (err) {
        lastErr = err
        const canRetry = shouldRetrySameModel(err) && attempt < maxAttempts - 1
        const canSwitch = shouldTryNextModel(err) && modelIndex < models.length - 1

        if (canRetry) {
          const retryAfterMs = 800 * (2 ** attempt) + Math.floor(Math.random() * 300)
          await sleep(retryAfterMs)
          continue
        }
        if (canSwitch) break
        throw err
      }
    }
  }

  throw lastErr || Object.assign(new Error('gemini failed'), { status: 502, code: 'gemini_failed' })
}

export async function handleGeminiArticleRequest(event, rawEnv = process.env) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method not allowed', code: 'method_not_allowed' })
  }

  try {
    const env = resolveServerEnv(rawEnv)
    const apiKey = geminiApiKey(env)
    if (!apiKey) {
      return json(503, { error: 'Gemini is not configured', code: 'gemini_not_configured' })
    }

    const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : ''

    await verifyUser(accessToken, env)

    let body = {}
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'invalid json', code: 'invalid_json' })
    }

    const mode = MODES.has(body.mode) ? body.mode : 'chat'
    const language = String(body.language || '').trim().slice(0, 16)
    const messages = normalizeMessages(body.messages)
    if (!messages.length) {
      return json(400, { error: 'messages required', code: 'messages_required' })
    }

    const articleIds = Array.isArray(body.articleIds) ? body.articleIds : []
    const articles = await fetchArticlesForUser(articleIds, accessToken, env)

    if ((mode === 'review' || mode === 'improve') && !articles.length) {
      return json(400, {
        error: 'Attach at least one article for this mode',
        code: 'article_required',
      })
    }

    const system = buildSystemPrompt({ mode, language, articles })
    const models = geminiModelCandidates(env)
    const { text: rawText, model } = await callGemini({ apiKey, models, system, messages })
    const { reply, draft } = parseDraft(rawText)

    return json(200, {
      reply,
      draft,
      mode,
      model,
      attached: articles.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        slug: a.slug,
      })),
    })
  } catch (err) {
    const status = err?.status || 502
    const code = err?.code
      || (status === 401 ? 'unauthorized' : status === 429 ? 'rate_limited' : 'gemini_failed')
    return json(status, {
      error: err?.message || 'gemini failed',
      code,
      model: err?.model || undefined,
    })
  }
}
