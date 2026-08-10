// Per-locale article translations authored in the newsroom editor and stored in
// public.article_translations. Nothing here calls a translation API: reads hit
// Supabase directly, and an article with no stored translation for the active
// locale simply falls back to its original text.

import { supabase } from './supabase'
import { normalizeLang } from './translateUtils.js'

export {
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
  shouldTranslateComment,
  buildArticleTranslateSample,
} from './translateUtils.js'

const TRANSLATION_COLUMNS = 'title,subtitle,content_html,cover_info,sources,media'

const memoryCache = new Map()

function normalizeTranslationRow(row = {}) {
  return {
    title: row.title || '',
    subtitle: row.subtitle || '',
    content_html: row.content_html || '',
    cover_info: row.cover_info || '',
    sources: row.sources || [],
    media: row.media || [],
  }
}

function cacheKey(articleId, locale) {
  return `${articleId}::${locale}`
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

/**
 * Stored translation for one article + locale.
 * Returns `{ original: true }` when nothing has been authored yet, which tells
 * the reader to keep showing the article in its original language.
 */
export async function fetchArticleTranslation(articleId, targetLocale) {
  const target = normalizeLang(targetLocale)
  if (!articleId || !target) throw new Error('invalid_request')

  const key = cacheKey(articleId, target)
  if (memoryCache.has(key)) return memoryCache.get(key)

  const { data, error } = await supabase
    .from('article_translations')
    .select(TRANSLATION_COLUMNS)
    .eq('article_id', articleId)
    .eq('locale', target)
    .maybeSingle()

  if (error) throw error

  // A row with no title and no body is a half-finished draft translation —
  // treat it as absent rather than blanking the article.
  const usable = data && (data.title || data.content_html)

  const result = usable
    ? {
      locale: target,
      title: data.title || '',
      subtitle: data.subtitle || '',
      content_html: data.content_html || '',
      cover_info: data.cover_info || '',
      sources: data.sources || [],
      media: data.media || [],
      original: false,
    }
    : { locale: target, original: true }

  memoryCache.set(key, result)
  return result
}

/** One query for a whole grid of articles — used by the card/list views. */
export async function fetchArticleTitleTranslations(articleIds, targetLocale) {
  const target = normalizeLang(targetLocale)
  const ids = [...new Set((articleIds || []).map(String).filter(Boolean))]
  if (!target || !ids.length) return { locale: target, titles: {}, subtitles: {} }

  const key = `titles::${target}::${[...ids].sort().join('|')}`
  if (memoryCache.has(key)) return memoryCache.get(key)

  const { data, error } = await supabase
    .from('article_translations')
    .select('article_id,title,subtitle')
    .eq('locale', target)
    .in('article_id', ids)

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

/** Every stored translation for an article, keyed by locale (editor use). */
export async function fetchArticleTranslations(articleId) {
  if (!articleId) return {}

  const { data, error } = await supabase
    .from('article_translations')
    .select(`locale,${TRANSLATION_COLUMNS}`)
    .eq('article_id', articleId)

  if (error) throw error

  return Object.fromEntries(
    (data || []).map((row) => [row.locale, normalizeTranslationRow(row)]),
  )
}

/** Translation rows for an article dashboard, grouped article → locale. */
export async function fetchArticleTranslationsForArticles(articleIds) {
  const ids = [...new Set((articleIds || []).map(String).filter(Boolean))]
  if (!ids.length) return {}

  const chunks = []
  for (let index = 0; index < ids.length; index += 100) {
    chunks.push(ids.slice(index, index + 100))
  }

  const responses = await Promise.all(chunks.map((chunk) => supabase
    .from('article_translations')
    .select(`article_id,locale,${TRANSLATION_COLUMNS}`)
    .in('article_id', chunk)))

  const grouped = {}
  for (const { data, error } of responses) {
    if (error) throw error
    for (const row of data || []) {
      if (!grouped[row.article_id]) grouped[row.article_id] = {}
      grouped[row.article_id][row.locale] = normalizeTranslationRow(row)
    }
  }
  return grouped
}

export async function saveArticleTranslation(articleId, locale, payload = {}) {
  const target = normalizeLang(locale)
  if (!articleId || !target) throw new Error('invalid_request')

  const { error } = await supabase
    .from('article_translations')
    .upsert({
      article_id: articleId,
      locale: target,
      provider: 'manual',
      title: payload.title || '',
      subtitle: payload.subtitle || null,
      content_html: payload.content_html || '',
      cover_info: payload.cover_info || null,
      sources: payload.sources || [],
      media: payload.media || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'article_id,locale' })

  if (error) throw error
  clearTranslateCache(articleId, target)
}

export async function deleteArticleTranslation(articleId, locale) {
  const target = normalizeLang(locale)
  if (!articleId || !target) throw new Error('invalid_request')

  const { error } = await supabase
    .from('article_translations')
    .delete()
    .eq('article_id', articleId)
    .eq('locale', target)

  if (error) throw error
  clearTranslateCache(articleId, target)
}
