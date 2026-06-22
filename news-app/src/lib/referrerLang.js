const LANG_KEY = 'icue_news_lang'

function isEnNewsReferrer() {
  try {
    const ref = document.referrer
    if (!ref) return false
    const url = new URL(ref)
    const host = url.hostname.toLowerCase()
    const fromEnSite = host === 'en.icue.vn' || host.endsWith('.en.icue.vn')
    const newsSection = /#\/News\b/i.test(url.hash) || /\/News/i.test(url.pathname)
    return fromEnSite && newsSection
  } catch {
    return false
  }
}

function cleanReferrerParams() {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('from') && !params.has('lang')) return
  params.delete('from')
  params.delete('lang')
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}

/** Pick the initial UI language before i18n boots. */
export function detectInitialLanguage() {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved) return saved

  const params = new URLSearchParams(window.location.search)
  const fromEnBanner = params.get('from') === 'en-news' || params.get('lang') === 'en'

  if (fromEnBanner || isEnNewsReferrer()) {
    localStorage.setItem(LANG_KEY, 'en')
    cleanReferrerParams()
    return 'en'
  }

  return 'vi'
}
