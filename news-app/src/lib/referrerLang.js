import { referrerSiteHint } from './siteOrigin'
import { normalizeUiLocale } from '../../../shared/site-routes/mainSitePaths.js'

const LANG_KEY = 'icue_news_lang'

function querySiteHint() {
  const params = new URLSearchParams(window.location.search)
  const from = params.get('from')
  const lang = params.get('lang')
  const site = params.get('site')

  const requested = normalizeUiLocale(lang)
  if (requested) return requested
  if (from === 'en-news' || site === 'en') return 'en'
  if (from === 'vi-news' || site === 'vi') return 'vi'
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
  if (fromEntry) {
    return persistLang(fromEntry)
  }

  const saved = normalizeUiLocale(localStorage.getItem(LANG_KEY))
  if (saved) return saved

  return 'vi'
}
