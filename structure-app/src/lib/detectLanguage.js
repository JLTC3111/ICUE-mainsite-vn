import { normalizeUiLocale } from '../../../shared/site-routes/mainSitePaths.js'
import { readLocalStorage, writeLocalStorage } from '../../../shared/storage/safeLocalStorage.js'

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
    writeLocalStorage(LANG_KEY, requested)
    return requested
  }

  const saved = normalizeUiLocale(readLocalStorage(LANG_KEY))
  if (saved) return saved

  if (
    params.get('from') === 'en-news'
    || params.get('site') === 'en'
    || isEnReferrer()
  ) {
    writeLocalStorage(LANG_KEY, 'en')
    return 'en'
  }

  return 'vi'
}
