import { normalizeUiLocale } from '../../../shared/site-routes/mainSitePaths.js'

const LANG_KEY = 'icue_news_lang'

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

export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)
  const requested = normalizeUiLocale(params.get('lang'))
  if (requested) {
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
