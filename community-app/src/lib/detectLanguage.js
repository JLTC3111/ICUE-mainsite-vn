import { normalizeUiLocale } from '@icue/site-routes/mainSitePaths.js'

/** Shared with every other ICUE app, so a language choice follows the reader. */
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
 * The Community Activities page is reached from a footer link on both icue.vn and
 * en.icue.vn, so the inbound hints matter as much as the stored preference.
 */
export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)

  // ?lang= wins over the stored value: this page is linked directly from both
  // sites, so an explicit request must not lose to an older preference.
  const requested = normalizeUiLocale(params.get('lang'))
  if (requested && SUPPORTED.has(requested)) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, requested)
    } catch {
      // Storage may be unavailable in privacy-restricted browsing contexts.
    }
    return requested
  }

  /*
   * A hand-off from en.icue.vn, which redirects several of its own routes here
   * with ?site=en. That is a signal from the current navigation, so it has to
   * outrank a preference stored on an earlier visit — and that preference is
   * almost always 'vi', because every icue.vn page writes this shared key.
   * Ordering it below the stored value is why arriving from the English site
   * used to land in Vietnamese for anyone who had ever been on icue.vn.
   */
  if (params.get('site') === 'en' || params.get('from') === 'en-news') {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    } catch {
      // Storage may be unavailable in privacy-restricted browsing contexts.
    }
    return 'en'
  }

  let saved = null
  try {
    saved = normalizeUiLocale(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    saved = null
  }
  if (saved && SUPPORTED.has(saved)) return saved
  if (saved) return 'en'

  // Weaker than the explicit parameters above: any link from the English site
  // arrives with this referrer, so it answers in English without overwriting a
  // stored choice.
  if (isEnReferrer()) return 'en'

  return 'vi'
}
