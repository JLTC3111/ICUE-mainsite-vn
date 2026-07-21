// Client-side article translation via /api/translate-article (Google Cloud).
// All UI locales in localeCodes.js — including English — are valid translation targets.

import {
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
} from './translateUtils.js'

export { inferSourceLanguage, normalizeLang, shouldTranslateArticle } from './translateUtils.js'

const memoryCache = new Map()

function cacheKey(articleId, locale) {
  return `${articleId}::${locale}`
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

  const res = await fetch(`${import.meta.env.BASE_URL}api/translate-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId, target }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'translation failed')
    err.code = data.code || `http_${res.status}`
    throw err
  }

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

  const res = await fetch(`${import.meta.env.BASE_URL}api/translate-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleIds: ids, target }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'translation failed')
    err.code = data.code || `http_${res.status}`
    throw err
  }

  memoryCache.set(key, data)
  return data
}

/** @deprecated Use translateArticleViaApi */
export async function translateArticle(article, target) {
  const result = await translateArticleViaApi(article.id, target)
  return {
    title: result.title,
    subtitle: result.subtitle,
    content_html: result.content_html,
  }
}
