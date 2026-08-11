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
 * The storage key is shared with the other ICUE apps, so a reader who picked a
 * language on the newsroom or Our Work keeps it here. Those apps carry six
 * languages and this one carries two: an unsupported stored value (ko, ja, …)
 * is dropped rather than passed to i18next, which would otherwise resolve it
 * through `fallbackLng` and quietly rewrite the shared key on the next write.
 */
export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)

  // ?lang= wins over the stored value: this page is linked to directly from
  // both sites, so an explicit request must not lose to an older preference.
  const requested = params.get('lang')
  if (requested && SUPPORTED.has(requested)) {
    localStorage.setItem(LANG_KEY, requested)
    return requested
  }

  const saved = localStorage.getItem(LANG_KEY)
  if (saved && SUPPORTED.has(saved)) return saved
  if (saved) return 'en'

  if (params.get('site') === 'en' || params.get('from') === 'en-news' || isEnReferrer()) {
    localStorage.setItem(LANG_KEY, 'en')
    return 'en'
  }

  return 'vi'
}
