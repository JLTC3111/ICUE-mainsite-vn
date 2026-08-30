import { sanitizeArticleHtml } from '@icue/text/sanitizeArticleHtml'
import { publicSelect } from './publicSupabase'
import { normalizeLang } from './translateUtils'

const TRANSLATION_COLUMNS = 'title,subtitle,content_html,cover_info,sources,media'
const memoryCache = new Map()

/**
 * Public reads have their own cache so anonymous pages never pull in the full
 * Supabase client. Editor writes must still invalidate it, otherwise returning
 * to the grid in the same tab can show the value that was cached before save.
 */
export function clearPublicTranslateCache(articleId, locale) {
  if (!articleId) {
    memoryCache.clear()
    return
  }

  const id = String(articleId)
  const target = normalizeLang(locale)

  for (const key of memoryCache.keys()) {
    const [prefix, keyLocale, ids = ''] = key.split('::')
    const isArticleEntry = prefix === id && (!target || keyLocale === target)
    const isTitleEntry = prefix === 'titles'
      && (!target || keyLocale === target)
      && ids.split('|').includes(id)

    if (isArticleEntry || isTitleEntry) memoryCache.delete(key)
  }
}

function normalizeTranslationRow(row = {}) {
  return {
    title: row.title || '',
    subtitle: row.subtitle || '',
    content_html: sanitizeArticleHtml(row.content_html || ''),
    cover_info: row.cover_info || '',
    sources: row.sources || [],
    media: row.media || [],
  }
}

export async function fetchArticleTranslation(articleId, targetLocale) {
  const target = normalizeLang(targetLocale)
  if (!articleId || !target) throw new Error('invalid_request')

  const key = `${articleId}::${target}`
  if (memoryCache.has(key)) return memoryCache.get(key)

  const { data, error } = await publicSelect('article_translations', {
    select: TRANSLATION_COLUMNS,
    article_id: `eq.${articleId}`,
    locale: `eq.${target}`,
    limit: 1,
  })
  if (error) throw error

  const row = data?.[0] || null
  const usable = row && (row.title || row.content_html)
  const result = row
    ? { locale: target, ...normalizeTranslationRow(row), original: !usable }
    : { locale: target, ...normalizeTranslationRow(), original: true }

  memoryCache.set(key, result)
  return result
}

export async function fetchArticleTitleTranslations(articleIds, targetLocale) {
  const target = normalizeLang(targetLocale)
  const ids = [...new Set((articleIds || []).map(String).filter(Boolean))]
  if (!target || !ids.length) return { locale: target, titles: {}, subtitles: {} }

  const key = `titles::${target}::${[...ids].sort().join('|')}`
  if (memoryCache.has(key)) return memoryCache.get(key)

  const { data, error } = await publicSelect('article_translations', {
    select: 'article_id,title,subtitle',
    locale: `eq.${target}`,
    article_id: `in.(${ids.join(',')})`,
  })
  if (error) return { locale: target, titles: {}, subtitles: {} }

  const titles = {}
  const subtitles = {}
  for (const row of data || []) {
    if (row.title) titles[row.article_id] = row.title
    if (row.subtitle) subtitles[row.article_id] = row.subtitle
  }

  const result = { locale: target, titles, subtitles }
  memoryCache.set(key, result)
  return result
}
