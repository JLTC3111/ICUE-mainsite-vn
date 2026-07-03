/** Map UI language codes to flag SVG filenames in /public/flags/. */
export const LANG_FLAG_FILE = {
  vi: 'vn',
  en: 'gb',
  de: 'de',
  fr: 'fr',
  ko: 'kr',
  ja: 'jp',
}

export function flagSvgUrl(langCode) {
  const file = LANG_FLAG_FILE[langCode] || langCode
  return `/flags/${file}.svg`
}
