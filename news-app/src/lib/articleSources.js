export const MAX_ARTICLE_SOURCES = 20
export const DEFAULT_ARTICLE_SOURCE_LANGUAGE = 'en'
const ARTICLE_SOURCE_LANGUAGE_CODES = new Set(['vi', 'en', 'de', 'fr', 'ko', 'ja'])

function trim(value) {
  return String(value ?? '').trim()
}

/**
 * Reference labels are entered using their bibliographic source language,
 * independently from the language of the surrounding article. Existing source
 * rows predate this metadata and were authored in English, so English is the
 * backwards-compatible default.
 */
export function normalizeArticleSourceLanguage(value) {
  const language = trim(value).split('-')[0].toLowerCase()
  return ARTICLE_SOURCE_LANGUAGE_CODES.has(language)
    ? language
    : DEFAULT_ARTICLE_SOURCE_LANGUAGE
}

export function articleSourceNeedsTranslation(source, targetLocale) {
  const target = trim(targetLocale).split('-')[0].toLowerCase()
  if (!target) return true
  return normalizeArticleSourceLanguage(source?.language) !== target
}

export function isValidSourceUrl(value) {
  const url = trim(value)
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeRow(raw = {}, { preserveDraft = false } = {}) {
  const label = preserveDraft ? String(raw.label ?? '') : trim(raw.label)
  const url = preserveDraft ? String(raw.url ?? '') : trim(raw.url)
  const publisher = preserveDraft ? String(raw.publisher ?? '') : trim(raw.publisher)
  const accessedAt = preserveDraft ? String(raw.accessed_at ?? raw.accessedAt ?? '') : trim(raw.accessed_at ?? raw.accessedAt)
  const id = trim(raw.id)
  const language = normalizeArticleSourceLanguage(raw.language)

  if (!label && !url && !publisher && !accessedAt) {
    if (preserveDraft && id) {
      return {
        id,
        language,
        label: '',
        url: '',
        publisher: null,
        accessed_at: null,
      }
    }
    return null
  }

  return {
    id: id || crypto.randomUUID(),
    language,
    label,
    url,
    publisher: publisher || null,
    accessed_at: accessedAt || null,
  }
}

/** Coerce DB / form values into a clean array (may include incomplete draft rows). */
export function normalizeSources(raw) {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : []
  return list.map((row) => normalizeRow(row)).filter(Boolean)
}

/** Like normalizeSources but keeps empty in-progress editor rows. */
export function normalizeSourcesForEditor(raw) {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : []
  return list.map((row) => normalizeRow(row, { preserveDraft: true })).filter(Boolean)
}

/** Drop incomplete rows; validate and cap before save. */
export function sanitizeSourcesForSave(rows) {
  const cleaned = normalizeSources(rows)
    .filter((row) => row.label && isValidSourceUrl(row.url))
    .slice(0, MAX_ARTICLE_SOURCES)

  return cleaned.map((row) => ({
    id: row.id,
    language: row.language,
    label: row.label,
    url: row.url,
    publisher: row.publisher,
    accessed_at: row.accessed_at,
  }))
}

/** Pick translated labels when auto-translate is active; URLs stay original. */
export function sourcesForDisplay(originalSources, translatedSources) {
  const original = sanitizeSourcesForSave(originalSources)
  if (!translatedSources?.length) return original

  const byId = Object.fromEntries(
    sanitizeSourcesForSave(translatedSources).map((row) => [row.id, row]),
  )

  return original.map((row) => {
    const translated = byId[row.id]
    if (!translated) return row
    return {
      ...row,
      label: translated.label || row.label,
      publisher: translated.publisher ?? row.publisher,
    }
  })
}

export function createEmptySource() {
  return {
    id: crypto.randomUUID(),
    language: DEFAULT_ARTICLE_SOURCE_LANGUAGE,
    label: '',
    url: '',
    publisher: '',
    accessed_at: '',
  }
}
