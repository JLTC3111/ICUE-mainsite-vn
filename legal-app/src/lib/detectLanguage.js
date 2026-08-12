import { normalizeUiLocale } from '@icue/site-routes/mainSitePaths.js'

export const LANGUAGE_STORAGE_KEY = 'icue_news_lang'

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
 * The storage key is shared with the other ICUE apps, so a reader who picked a
 * language in the newsroom, on Our Work or on Contact keeps it here. Legal
 * pages are frequently reached from a footer link on either site, so the
 * inbound hints matter more here than anywhere else.
 */
export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)

  // ?lang= wins over the stored value: these pages are linked directly from
  // both sites, so an explicit request must not lose to an older preference.
  const requested = normalizeUiLocale(params.get('lang'))
  if (requested && SUPPORTED.has(requested)) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, requested)
    } catch {
      // Storage may be unavailable in privacy-restricted browsing contexts.
    }
    return requested
  }

  let saved = null
  try {
    saved = normalizeUiLocale(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    saved = null
  }
  if (saved && SUPPORTED.has(saved)) return saved
  if (saved) return 'en'

  if (params.get('site') === 'en' || params.get('from') === 'en-news' || isEnReferrer()) {
    return 'en'
  }

  return 'vi'
}
