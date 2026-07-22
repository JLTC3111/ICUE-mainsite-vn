export const MAX_ARTICLE_SOURCES = 20

function trim(value) {
  return String(value ?? '').trim()
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
  const label = trim(raw.label)
  const url = trim(raw.url)
  const publisher = trim(raw.publisher)
  const accessedAt = trim(raw.accessed_at ?? raw.accessedAt)
  const id = trim(raw.id)

  if (!label && !url && !publisher && !accessedAt) {
    if (preserveDraft && id) {
      return {
        id,
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
    label: '',
    url: '',
    publisher: '',
    accessed_at: '',
  }
}
