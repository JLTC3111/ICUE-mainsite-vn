export const ARCHIVE_COPY_LANGS = ['vi', 'en', 'de', 'fr', 'ja', 'ko']

export function normalizeArchiveLang(lang) {
  const code = String(lang || 'vi').split('-')[0].toLowerCase()
  return ARCHIVE_COPY_LANGS.includes(code) ? code : 'vi'
}

export function formatArchiveDate(dateIso, lang) {
  if (!dateIso) return ''
  try {
    return new Intl.DateTimeFormat(normalizeArchiveLang(lang), {
      dateStyle: 'long',
    }).format(new Date(`${dateIso}T00:00:00`))
  } catch {
    return dateIso
  }
}

export function pickCopy(value, fallback) {
  if (value == null || value === '') return fallback
  return value
}
