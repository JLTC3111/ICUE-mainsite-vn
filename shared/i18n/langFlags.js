/** Map UI language codes to flag SVG filenames in each app's public/flags/. */
export const LANG_FLAG_FILE = {
  vi: 'vn',
  en: 'gb',
  de: 'de',
  fr: 'fr',
  ko: 'kr',
  ja: 'jp',
}

export const LANG_FLAG_FILES = Object.values(LANG_FLAG_FILE)

export function flagSvgUrl(langCode) {
  const file = LANG_FLAG_FILE[langCode] || langCode
  const base = import.meta.env.BASE_URL || '/'
  return `${base}flags/${file}.svg`
}
