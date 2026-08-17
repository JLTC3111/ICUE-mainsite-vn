import { normalizeUiLocale } from '../../../shared/site-routes/mainSitePaths.js'
import { servesAllLocales } from './routes.js'

/** Shared with the newsroom, Our Work and Contact, so a choice made on one
    of them survives the walk back to the home page. */
const LANG_KEY = 'icue_news_lang'

/** The languages this build renders on any route. Must match i18n.js. */
const UI_CODES = new Set(['vi', 'de', 'fr', 'ko', 'ja'])

/**
 * English is not in the set above, and that is still deliberate: on this host
 * English means en.icue.vn, and a reader who lands on icue.vn/ with a stored
 * `en` gets the Vietnamese page the URL promised rather than being bounced
 * across domains on load. The flag menu still offers the crossing.
 *
 * About is the one exception. There is a single About page now and it lives
 * here — en.icue.vn/about-us redirects to it — so on that route English has to
 * render, or the redirect would deliver Vietnamese to an English reader. See
 * SHARED_LOCALE_PATHS in routes.js for the other half of that arrangement.
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

  // `lang` is this app's own hand-off parameter. `site` is the one Contact and
  // Our Work already answer to, and it is what en.icue.vn's _redirects sends
  // when it forwards /about-us here — that file marks all three cross-domain
  // hops the same way, so this page has to understand the same mark.
  const requested = normalizeUiLocale(params.get('lang') || params.get('site'))
  if (requested && accepted.has(requested)) {
    store(requested)
    return requested
  }

  const saved = readStored()
  if (saved && accepted.has(saved)) return saved

  return 'vi'
}
