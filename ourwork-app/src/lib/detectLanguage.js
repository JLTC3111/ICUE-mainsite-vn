import { normalizeUiLocale } from '@icue/site-routes/mainSitePaths.js'
import { readLocalStorage, writeLocalStorage } from '../../../shared/storage/safeLocalStorage.js'

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
    writeLocalStorage(LANG_KEY, requested)
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
    writeLocalStorage(LANG_KEY, 'en')
    return 'en'
  }

  const saved = normalizeUiLocale(readLocalStorage(LANG_KEY))
  if (saved) return saved

  // Weaker than the explicit parameters above: any link from the English site
  // arrives with this referrer, so it answers in English without overwriting a
  // stored choice.
  if (isEnReferrer()) return 'en'

  return 'vi'
}
