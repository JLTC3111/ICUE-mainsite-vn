import { referrerSiteHint } from './siteOrigin'

const LANG_KEY = 'icue_news_lang'

function querySiteHint() {
  const params = new URLSearchParams(window.location.search)
  const from = params.get('from')
  const lang = params.get('lang')
  const site = params.get('site')

  if (from === 'en-news' || lang === 'en' || site === 'en') return 'en'
  if (from === 'vi-news' || lang === 'vi' || site === 'vi') return 'vi'
  return null
}

function persistLang(lang) {
  localStorage.setItem(LANG_KEY, lang)
  return lang
}

/**
 * Pick the initial UI language before i18n boots.
 * Main-site entry (query / referrer) wins over a previously saved preference
 * so VI → newsroom opens in vi and EN → newsroom opens in en.
 */
export function detectInitialLanguage() {
  const fromEntry = querySiteHint() || referrerSiteHint()
  if (fromEntry === 'en' || fromEntry === 'vi') {
    return persistLang(fromEntry)
  }

  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'en' || saved === 'vi') return saved
  if (saved) return saved

  return 'vi'
}
