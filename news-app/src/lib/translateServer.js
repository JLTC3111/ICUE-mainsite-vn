import { normalizeHtmlUnicode, normalizeUnicode } from './normalizeUnicode.js'
import * as sanitizeArticleHtmlModule from '../../../shared/text/sanitizeArticleHtml.js'
import { resolveServerEnv, supabaseServiceKey } from './serverEnv.js'
import {
  detectSourceLanguage,
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
  translateFields,
  translatePlainText,
  translateSources,
} from './translateProviders.js'
import { buildArticleTranslateSample, shouldTranslateComment } from './translateUtils.js'
import { sanitizeSourcesForSave } from './articleSources.js'

function pickNamedExport(moduleNs, name) {
  if (typeof moduleNs?.[name] === 'function') return moduleNs[name]
  const fallback = moduleNs?.default
  if (typeof fallback?.[name] === 'function') return fallback[name]
  if (fallback && typeof fallback === 'object' && typeof fallback.default?.[name] === 'function') {
    return fallback.default[name]
  }
  throw new Error(`missing_export_${name}`)
}

const sanitizeArticleHtml = pickNamedExport(sanitizeArticleHtmlModule, 'sanitizeArticleHtml')
const sanitizePlainText = pickNamedExport(sanitizeArticleHtmlModule, 'sanitizePlainText')

const ARTICLE_FIELDS = 'id,title,subtitle,content_html,language,status,sources'

function supabaseConfig(env) {
  const serviceKey = supabaseServiceKey(env)
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    serviceKey:
      serviceKey
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
    `${url}/rest/v1/article_translations?article_id=eq.${encodeURIComponent(articleId)}&locale=eq.${encodeURIComponent(locale)}&select=title,subtitle,content_html,sources,provider,source_lang`,
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
    sources: payload.sources || [],
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

  const detectSample = buildArticleTranslateSample(article)

  const declaredSource = normalizeLang(article.language || 'vi')
  const sourceLang = inferSourceLanguage(declaredSource, detectSample)
  const apiSourceLang = (await detectSourceLanguage(detectSample, env)) || sourceLang

  const articleSources = sanitizeSourcesForSave(article.sources)

  if (!shouldTranslateArticle(sourceLang, locale, detectSample)) {
    return {
      cached: false,
      provider: null,
      source_lang: sourceLang,
      locale,
      title: sanitizePlainText(article.title || ''),
      subtitle: article.subtitle ? sanitizePlainText(article.subtitle) : '',
      content_html: normalizeHtmlUnicode(sanitizeArticleHtml(article.content_html || '')),
      sources: articleSources,
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
      title: sanitizePlainText(cached.title || ''),
      subtitle: cached.subtitle ? sanitizePlainText(cached.subtitle) : '',
      content_html: normalizeHtmlUnicode(sanitizeArticleHtml(cached.content_html || '')),
      sources: sanitizeSourcesForSave(cached.sources?.length ? cached.sources : articleSources),
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
    apiSourceLang,
    env,
  )

  const translatedSources = articleSources.length
    ? await translateSources(articleSources, locale, apiSourceLang, env)
    : []

  const result = {
    cached: false,
    provider: translated.provider,
    source_lang: sourceLang,
    locale,
    title: sanitizePlainText(translated.title || ''),
    subtitle: translated.subtitle ? sanitizePlainText(translated.subtitle) : '',
    content_html: normalizeHtmlUnicode(sanitizeArticleHtml(translated.content_html || '')),
    sources: sanitizeSourcesForSave(translatedSources),
    original: false,
  }

  await upsertCachedTranslation(articleId, locale, {
    provider: translated.provider,
    source_lang: sourceLang,
    title: result.title,
    subtitle: result.subtitle,
    content_html: result.content_html,
    sources: result.sources,
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

async function fetchCommentsByIds(commentIds, env) {
  const { url, serviceKey } = supabaseConfig(env)
  if (!url || !serviceKey) throw new Error('supabase_not_configured')

  const ids = [...new Set((commentIds || []).map(String).filter(Boolean))]
  if (!ids.length) return []

  const filter = ids.map((id) => encodeURIComponent(id)).join(',')
  const res = await fetch(
    `${url}/rest/v1/article_comments?id=in.(${filter})&select=id,body,article_id`,
    { headers: restHeaders(serviceKey) },
  )
  if (!res.ok) throw new Error(`comments_fetch_${res.status}`)
  return (await res.json()) ?? []
}

async function fetchCachedCommentTranslations(commentIds, locale, env) {
  const { url, serviceKey } = supabaseConfig(env)
  if (!url || !serviceKey) return {}

  const ids = [...new Set((commentIds || []).map(String).filter(Boolean))]
  if (!ids.length) return {}

  const filter = ids.map((id) => encodeURIComponent(id)).join(',')
  const res = await fetch(
    `${url}/rest/v1/comment_translations?comment_id=in.(${filter})&locale=eq.${encodeURIComponent(locale)}&select=comment_id,body,provider,source_lang`,
    { headers: restHeaders(serviceKey) },
  )
  if (!res.ok) return {}

  const rows = await res.json()
  return Object.fromEntries(
    (rows || []).map((row) => [row.comment_id, row]),
  )
}

async function upsertCommentTranslation(commentId, locale, payload, env) {
  const { url, serviceKey } = supabaseConfig(env)
  if (!url || !serviceKey) return

  const body = {
    comment_id: commentId,
    locale,
    provider: payload.provider,
    source_lang: payload.source_lang || null,
    body: payload.body || '',
    updated_at: new Date().toISOString(),
  }

  await fetch(`${url}/rest/v1/comment_translations?on_conflict=comment_id,locale`, {
    method: 'POST',
    headers: {
      ...restHeaders(serviceKey),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  })
}

async function translateCommentBody(comment, locale, cachedRows, env) {
  const body = normalizeUnicode(comment.body || '')
  if (!shouldTranslateComment(body, locale)) {
    return { id: comment.id, body, original: true, cached: false, provider: null }
  }

  const cached = cachedRows[comment.id]
  if (cached?.body) {
    return {
      id: comment.id,
      body: normalizeUnicode(cached.body),
      original: false,
      cached: true,
      provider: cached.provider,
    }
  }

  const sourceLang = inferSourceLanguage('', body)
  const translated = await translatePlainText(body, locale, sourceLang, env)
  const resultBody = normalizeUnicode(translated.text || body)

  if (!translated.original && translated.provider) {
    await upsertCommentTranslation(comment.id, locale, {
      provider: translated.provider,
      source_lang: sourceLang,
      body: resultBody,
    }, env)
  }

  return {
    id: comment.id,
    body: resultBody,
    original: !!translated.original,
    cached: false,
    provider: translated.provider,
  }
}

export async function translateCommentsBatch(commentIds, targetLocale, env = process.env) {
  const locale = normalizeLang(targetLocale)
  const ids = [...new Set((commentIds || []).map(String).filter(Boolean))]
  if (!locale || !ids.length) {
    return { locale, bodies: {} }
  }

  const comments = await fetchCommentsByIds(ids, env)
  const cachedRows = await fetchCachedCommentTranslations(comments.map((c) => c.id), locale, env)
  const bodies = {}
  let cursor = 0
  const workers = Math.min(4, comments.length || 1)

  async function worker() {
    while (cursor < comments.length) {
      const index = cursor++
      const comment = comments[index]
      try {
        const result = await translateCommentBody(comment, locale, cachedRows, env)
        if (result?.body) bodies[result.id] = result.body
      } catch {
        bodies[comment.id] = normalizeUnicode(comment.body || '')
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()))
  return { locale, bodies }
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
  const runtimeEnv = resolveServerEnv(env)

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
  const commentIds = payload.commentIds || payload.comment_ids

  if (Array.isArray(commentIds)) {
    const ids = commentIds.map(String).filter(Boolean)
    if (!ids.length || !target) {
      return jsonResponse(422, { error: 'commentIds and target required', code: 'invalid_request' })
    }
    try {
      const result = await translateCommentsBatch(ids, target, runtimeEnv)
      return jsonResponse(200, result)
    } catch (err) {
      const code = err?.message || 'translate_failed'
      if (code === 'supabase_not_configured') {
        return jsonResponse(503, { error: 'supabase not configured on server', code })
      }
      if (code === 'google_not_configured' || code === 'deepl_not_configured') {
        return jsonResponse(503, { error: 'translation provider not configured', code })
      }
      return jsonResponse(502, { error: 'translation failed', code })
    }
  }

  if (Array.isArray(batchIds)) {
    const articleIds = batchIds.map(String).filter(Boolean)
    if (!articleIds.length || !target) {
      return jsonResponse(422, { error: 'articleIds and target required', code: 'invalid_request' })
    }
    try {
      const result = await translateArticleTitlesBatch(articleIds, target, runtimeEnv)
      return jsonResponse(200, result)
    } catch (err) {
      const code = err?.message || 'translate_failed'
      if (code === 'supabase_not_configured') {
        return jsonResponse(503, { error: 'supabase not configured on server', code })
      }
      if (code === 'google_not_configured' || code === 'deepl_not_configured') {
        return jsonResponse(503, { error: 'translation provider not configured', code })
      }
      return jsonResponse(502, { error: 'translation failed', code })
    }
  }

  if (!articleId || !target) {
    return jsonResponse(422, { error: 'articleId and target required', code: 'invalid_request' })
  }

  try {
    const result = await translateArticleForLocale(articleId, target, runtimeEnv)
    return jsonResponse(200, result)
  } catch (err) {
    const code = err?.message || 'translate_failed'
    if (code === 'article_not_found') {
      return jsonResponse(404, { error: 'article not found', code })
    }
    if (code === 'supabase_not_configured') {
      return jsonResponse(503, { error: 'supabase not configured on server', code })
    }
    if (code === 'google_not_configured' || code === 'deepl_not_configured') {
      return jsonResponse(503, { error: 'translation provider not configured', code })
    }
    return jsonResponse(502, { error: 'translation failed', code })
  }
}
