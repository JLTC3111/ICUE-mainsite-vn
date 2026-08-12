import { normalizeUiLocale } from '@icue/site-routes/mainSitePaths.js'

const LANG_KEY = 'icue_news_lang'

/** Must match SUPPORTED_LANGUAGES in ./i18n.js. */
const SUPPORTED = new Set(['vi', 'en', 'de', 'fr', 'ko', 'ja'])

function isEnReferrer() {
  try {
    const ref = document.referrer
    if (!ref) return false
    const host = new URL(ref).hostname.toLowerCase()
    return host === 'en.icue.vn' || host.endsWith('.en.icue.vn')
  } catch {
    return false
  }
}

/**
 * This page replaces the Our Work page of BOTH icue.vn and en.icue.vn, so an
 * en.icue.vn visitor must land in English without touching the flag.
 */
export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)

  // ?lang= wins over the stored value: this page carries all six languages and
  // is linked to directly, so an explicit request must not be overridden by a
  // preference set on some other page.
  const requested = normalizeUiLocale(params.get('lang'))
  if (requested && SUPPORTED.has(requested)) {
    localStorage.setItem(LANG_KEY, requested)
    return requested
  }

  const saved = normalizeUiLocale(localStorage.getItem(LANG_KEY))
  if (saved) return saved

  if (
    params.get('from') === 'en-news'
    || params.get('site') === 'en'
    || isEnReferrer()
  ) {
    localStorage.setItem(LANG_KEY, 'en')
    return 'en'
  }

  return 'vi'
}
