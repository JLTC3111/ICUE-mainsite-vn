import { normalizeHtmlUnicode, normalizeUnicode } from './normalizeUnicode.js'
import {
  detectSourceLanguage,
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
  translateFields,
} from './translateProviders.js'

const ARTICLE_FIELDS = 'id,title,subtitle,content_html,language,status'

function supabaseConfig(env) {
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    serviceKey:
      env.SUPABASE_SERVICE_ROLE_KEY
      || env.SUPABASE_SERVICE_KEY
      || env.SUPABASE_ANON_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || '',
  }
}

function restHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function fetchPublishedArticle(articleId, env) {
  const { url, serviceKey } = supabaseConfig(env)
  if (!url || !serviceKey) throw new Error('supabase_not_configured')

  const res = await fetch(
    `${url}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&status=eq.published&select=${ARTICLE_FIELDS}`,
    { headers: restHeaders(serviceKey) },
  )
  if (!res.ok) throw new Error(`article_fetch_${res.status}`)
  const rows = await res.json()
  return rows?.[0] || null
}

async function fetchCachedTranslation(articleId, locale, env) {
  const { url, serviceKey } = supabaseConfig(env)
  if (!url || !serviceKey) return null

  const res = await fetch(
    `${url}/rest/v1/article_translations?article_id=eq.${encodeURIComponent(articleId)}&locale=eq.${encodeURIComponent(locale)}&select=title,subtitle,content_html,provider,source_lang`,
    { headers: restHeaders(serviceKey) },
  )
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] || null
}

async function upsertCachedTranslation(articleId, locale, payload, env) {
  const { url, serviceKey } = supabaseConfig(env)
  if (!url || !serviceKey) return

  const body = {
    article_id: articleId,
    locale,
    provider: payload.provider,
    source_lang: payload.source_lang || null,
    title: payload.title || '',
    subtitle: payload.subtitle || null,
    content_html: payload.content_html || '',
    updated_at: new Date().toISOString(),
  }

  await fetch(`${url}/rest/v1/article_translations?on_conflict=article_id,locale`, {
    method: 'POST',
    headers: {
      ...restHeaders(serviceKey),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  })
}

export async function translateArticleForLocale(articleId, targetLocale, env = process.env) {
  const locale = normalizeLang(targetLocale)
  if (!articleId || !locale) throw new Error('invalid_request')

  const article = await fetchPublishedArticle(articleId, env)
  if (!article) throw new Error('article_not_found')

  const detectSample = [article.title, article.subtitle, article.content_html?.replace(/<[^>]+>/g, ' ')]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1200)

  const declaredSource = normalizeLang(article.language || 'vi')
  const detected = await detectSourceLanguage(detectSample, env)
  const sourceLang = detected || inferSourceLanguage(declaredSource, detectSample)

  if (!shouldTranslateArticle(sourceLang, locale, detectSample)) {
    return {
      cached: false,
      provider: null,
      source_lang: sourceLang,
      locale,
      title: normalizeUnicode(article.title || ''),
      subtitle: normalizeUnicode(article.subtitle || ''),
      content_html: normalizeHtmlUnicode(article.content_html || ''),
      original: true,
    }
  }

  const cached = await fetchCachedTranslation(articleId, locale, env)
  if (cached) {
    return {
      cached: true,
      provider: cached.provider,
      source_lang: cached.source_lang || sourceLang,
      locale,
      title: normalizeUnicode(cached.title || ''),
      subtitle: normalizeUnicode(cached.subtitle || ''),
      content_html: normalizeHtmlUnicode(cached.content_html || ''),
      original: false,
    }
  }

  const translated = await translateFields(
    {
      title: article.title || '',
      subtitle: article.subtitle || '',
      content_html: article.content_html || '',
    },
    locale,
    sourceLang,
    env,
  )

  const result = {
    cached: false,
    provider: translated.provider,
    source_lang: sourceLang,
    locale,
    title: normalizeUnicode(translated.title || ''),
    subtitle: normalizeUnicode(translated.subtitle || ''),
    content_html: normalizeHtmlUnicode(translated.content_html || ''),
    original: false,
  }

  await upsertCachedTranslation(articleId, locale, {
    provider: translated.provider,
    source_lang: sourceLang,
    title: result.title,
    subtitle: result.subtitle,
    content_html: result.content_html,
  }, env)

  return result
}

export async function translateArticleTitlesBatch(articleIds, targetLocale, env = process.env) {
  const locale = normalizeLang(targetLocale)
  const ids = [...new Set((articleIds || []).map(String).filter(Boolean))]
  if (!locale || !ids.length) {
    return { locale, titles: {} }
  }

  const titles = {}
  let cursor = 0
  const workers = Math.min(4, ids.length)

  async function worker() {
    while (cursor < ids.length) {
      const index = cursor++
      const articleId = ids[index]
      try {
        const result = await translateArticleForLocale(articleId, locale, env)
        if (result?.title) titles[articleId] = result.title
      } catch {
        // Keep original title on the client when one article fails.
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()))
  return { locale, titles }
}

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }
}

export async function handleTranslateArticleRequest(event, env = process.env) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, '')
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'method not allowed' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'invalid json', code: 'bad_request' })
  }

  const articleId = String(payload.articleId || payload.article_id || '').trim()
  const target = normalizeLang(payload.target || payload.locale || payload.lang)
  const batchIds = payload.articleIds || payload.article_ids

  if (Array.isArray(batchIds)) {
    const articleIds = batchIds.map(String).filter(Boolean)
    if (!articleIds.length || !target) {
      return jsonResponse(422, { error: 'articleIds and target required', code: 'invalid_request' })
    }
    try {
      const result = await translateArticleTitlesBatch(articleIds, target, env)
      return jsonResponse(200, result)
    } catch (err) {
      const code = err?.message || 'translate_failed'
      return jsonResponse(502, { error: 'translation failed', code })
    }
  }

  if (!articleId || !target) {
    return jsonResponse(422, { error: 'articleId and target required', code: 'invalid_request' })
  }

  try {
    const result = await translateArticleForLocale(articleId, target, env)
    return jsonResponse(200, result)
  } catch (err) {
    const code = err?.message || 'translate_failed'
    if (code === 'article_not_found') {
      return jsonResponse(404, { error: 'article not found', code })
    }
    if (code === 'google_not_configured' || code === 'deepl_not_configured') {
      return jsonResponse(503, { error: 'translation provider not configured', code })
    }
    return jsonResponse(502, { error: 'translation failed', code })
  }
}
