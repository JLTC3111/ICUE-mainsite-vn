// Client-side article translation via /api/translate-article (Google Cloud).
// All UI locales in localeCodes.js — including English — are valid translation targets.

import {
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
  buildArticleTranslateSample,
} from './translateUtils.js'

export {
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
  shouldTranslateComment,
  buildArticleTranslateSample,
} from './translateUtils.js'

const memoryCache = new Map()

function cacheKey(articleId, locale) {
  return `${articleId}::${locale}`
}

function translateEndpoint() {
  const base = import.meta.env.BASE_URL || '/newsroom/'
  return new URL('api/translate-article', window.location.origin + base).toString()
}

async function postTranslate(body, { signal } = {}) {
  const res = await fetch(translateEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'translation failed')
    err.code = data.code || `http_${res.status}`
    err.status = res.status
    throw err
  }
  return data
}

/** Retry once on network / 5xx — common on mobile radios + cold Netlify functions. */
async function postTranslateWithRetry(body) {
  try {
    return await postTranslate(body)
  } catch (err) {
    const retryable = !err.status || err.status >= 500 || err.name === 'TypeError'
    if (!retryable) throw err
    await new Promise((resolve) => setTimeout(resolve, 450))
    return postTranslate(body)
  }
}

export function clearTranslateCache(articleId, locale) {
  if (!articleId) {
    memoryCache.clear()
    return
  }
  const target = normalizeLang(locale)
  if (target) memoryCache.delete(cacheKey(articleId, target))
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${articleId}::`) || key.includes(articleId)) {
      memoryCache.delete(key)
    }
  }
}

export async function translateArticleViaApi(articleId, targetLocale) {
  const target = normalizeLang(targetLocale)
  if (!articleId || !target) {
    throw new Error('invalid_request')
  }

  const key = cacheKey(articleId, target)
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }

  const data = await postTranslateWithRetry({ articleId, target })
  memoryCache.set(key, data)
  return data
}

function batchCacheKey(articleIds, locale) {
  return `${locale}::${[...articleIds].sort().join('|')}`
}

export async function translateArticleTitlesViaApi(articleIds, targetLocale) {
  const target = normalizeLang(targetLocale)
  const ids = [...new Set((articleIds || []).map(String).filter(Boolean))]
  if (!target || !ids.length) {
    return { locale: target, titles: {} }
  }

  const key = batchCacheKey(ids, target)
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }

  const data = await postTranslateWithRetry({ articleIds: ids, target })
  memoryCache.set(key, data)
  return data
}

function commentCacheKey(commentIds, locale) {
  return `comments::${locale}::${[...commentIds].sort().join('|')}`
}

export async function translateCommentsViaApi(commentIds, targetLocale) {
  const target = normalizeLang(targetLocale)
  const ids = [...new Set((commentIds || []).map(String).filter(Boolean))]
  if (!target || !ids.length) {
    return { locale: target, bodies: {} }
  }

  const key = commentCacheKey(ids, target)
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }

  const data = await postTranslateWithRetry({ commentIds: ids, target })
  memoryCache.set(key, data)
  return data
}

export async function translateArticle(article, target) {
  const result = await translateArticleViaApi(article.id, target)
  return {
    title: result.title,
    subtitle: result.subtitle,
    content_html: result.content_html,
    sources: result.sources,
  }
}
