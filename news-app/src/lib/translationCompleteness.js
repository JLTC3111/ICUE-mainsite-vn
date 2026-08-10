import { buildArticleTranslateSample, inferSourceLanguage, normalizeLang } from './translateUtils.js'

function text(value) {
  return String(value ?? '').trim()
}

function htmlText(value) {
  return text(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function rowsById(rows) {
  return new Map(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.id != null)
      .map((row) => [String(row.id), row]),
  )
}

/** Required translated elements are derived from authored source content. */
export function getLocaleTranslationCompleteness(article = {}, translation = null) {
  const missing = []
  const row = translation || {}

  if (text(article.title) && !text(row.title)) missing.push({ kind: 'title' })
  if (text(article.subtitle) && !text(row.subtitle)) missing.push({ kind: 'subtitle' })
  if (htmlText(article.content_html) && !htmlText(row.content_html)) missing.push({ kind: 'content' })
  if (text(article.cover_info) && !text(row.cover_info)) missing.push({ kind: 'cover_info' })

  const translatedMedia = rowsById(row.media)
  for (const item of Array.isArray(article.media) ? article.media : []) {
    if (item?.id == null || !text(item.info)) continue
    if (!text(translatedMedia.get(String(item.id))?.info)) {
      missing.push({ kind: 'media_caption', id: String(item.id), mediaKind: item.kind || 'image' })
    }
  }

  const translatedSources = rowsById(row.sources)
  for (const source of Array.isArray(article.sources) ? article.sources : []) {
    if (source?.id == null) continue
    const translated = translatedSources.get(String(source.id))
    if (text(source.label) && !text(translated?.label)) {
      missing.push({ kind: 'source_label', id: String(source.id) })
    }
    if (text(source.publisher) && !text(translated?.publisher)) {
      missing.push({ kind: 'source_publisher', id: String(source.id) })
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    missingCount: missing.length,
  }
}

/** Completeness across every supported target locale for one article. */
export function getArticleTranslationCompleteness(article = {}, translations = {}, supportedLanguages = []) {
  const declared = normalizeLang(article.language) || 'vi'
  const sourceLanguage = inferSourceLanguage(declared, buildArticleTranslateSample(article)) || declared
  const targetLocales = supportedLanguages
    .map((language) => normalizeLang(language?.code ?? language))
    .filter((locale) => locale && locale !== sourceLanguage)

  const locales = Object.fromEntries(
    targetLocales.map((locale) => [
      locale,
      getLocaleTranslationCompleteness(article, translations?.[locale]),
    ]),
  )
  const completeLocales = targetLocales.filter((locale) => locales[locale].complete)
  const incompleteLocales = targetLocales.filter((locale) => !locales[locale].complete)

  return {
    complete: incompleteLocales.length === 0,
    sourceLanguage,
    totalLocales: targetLocales.length,
    completedLocales: completeLocales.length,
    incompleteLocales,
    locales,
  }
}
