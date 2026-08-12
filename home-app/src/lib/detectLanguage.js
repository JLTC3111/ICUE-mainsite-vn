import { normalizeUiLocale } from '../../../shared/site-routes/mainSitePaths.js'

/** Shared with the newsroom, Our Work and Contact, so a choice made on one
    of them survives the walk back to the home page. */
const LANG_KEY = 'icue_news_lang'

/** The UI languages this app actually ships. Must match UI_LANGUAGES in i18n.js. */
const UI_CODES = new Set(['vi', 'de', 'fr', 'ko', 'ja'])

function readStored() {
  try {
    return localStorage.getItem(LANG_KEY)
  } catch {
    return null
  }
}

function store(code) {
  try {
    localStorage.setItem(LANG_KEY, code)
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

/**
 * A stored `en` is deliberately not honoured here and not overwritten: English
 * on this site means en.icue.vn, and silently bouncing a reader across domains
 * on page load is worse than showing them the Vietnamese page the URL promised.
 * They get the Vietnamese UI and the flag menu still offers the crossing.
 */
export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)

  const requested = normalizeUiLocale(params.get('lang'))
  if (requested && UI_CODES.has(requested)) {
    store(requested)
    return requested
  }

  const saved = readStored()
  if (saved && UI_CODES.has(saved)) return saved

  return 'vi'
}
