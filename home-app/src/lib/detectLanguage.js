import { normalizeUiLocale } from '../../../shared/site-routes/mainSitePaths.js'
import { servesAllLocales } from './routes.js'

/** Shared with the newsroom, Our Work and Contact, so a choice made on one
    of them survives the walk back to the home page. */
const LANG_KEY = 'icue_news_lang'

/** The languages this build renders on any route. Must match i18n.js. */
const UI_CODES = new Set(['vi', 'de', 'fr', 'ko', 'ja'])

/**
 * English remains excluded for Home: there it means en.icue.vn, and a stored
 * preference must not silently turn icue.vn/ into the English home. Every
 * home-app subpage is different: it is canonical on icue.vn and accepts
 * English in place.
 */
function acceptedCodes() {
  return servesAllLocales() ? new Set([...UI_CODES, 'en']) : UI_CODES
}

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

export function detectInitialLanguage() {
  const params = new URLSearchParams(window.location.search)
  const accepted = acceptedCodes()

  // `lang` is the canonical hand-off parameter. `site` and `from=en-news`
  // remain readable for bookmarks created before the routing contract converged.
  const requested = normalizeUiLocale(params.get('lang') || params.get('site'))
  if (requested && accepted.has(requested)) {
    store(requested)
    return requested
  }

  if (params.get('from') === 'en-news' && accepted.has('en')) {
    store('en')
    return 'en'
  }

  const saved = readStored()
  if (saved && accepted.has(saved)) return saved

  return 'vi'
}
