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
  const saved = localStorage.getItem(LANG_KEY)
  if (saved) return saved

  const params = new URLSearchParams(window.location.search)
  if (
    params.get('lang') === 'en'
    || params.get('from') === 'en-news'
    || params.get('site') === 'en'
    || isEnReferrer()
  ) {
    localStorage.setItem(LANG_KEY, 'en')
    return 'en'
  }

  return 'vi'
}
