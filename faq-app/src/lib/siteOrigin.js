import {
  mainSiteOriginForLocale,
  normalizeUiLocale,
  newsroomUrl,
  resolveMainSiteLink,
  SITES,
  withLocale,
} from '@icue/site-routes/mainSitePaths.js'

export { SITES }

function isEnHost(hostname) {
  const host = hostname.toLowerCase()
  return host === 'en.icue.vn' || host.endsWith('.en.icue.vn')
}

function isViHost(hostname) {
  const host = hostname.toLowerCase()
  return host === 'icue.vn' || host === 'www.icue.vn'
}

function referrerSiteHint() {
  try {
    const ref = document.referrer
    if (!ref) return null
    const host = new URL(ref).hostname
    if (isEnHost(host)) return 'en'
    if (isViHost(host)) return 'vi'
  } catch {
    // ignore
  }
  return null
}

const ENTRY_SITE_KEY = 'icue_faq_entry_site'

/**
 * The app is served from icue.vn only, but en.icue.vn links into it. Remember
 * which site the visitor came from so chrome links send them back there.
 */
export function detectEntrySite() {
  try {
    const cached = sessionStorage.getItem(ENTRY_SITE_KEY)
    if (cached === 'en' || cached === 'vi') return cached
  } catch { /* Storage may be blocked on a restored/private tab. */ }
  const site = new URLSearchParams(window.location.search).get('site') === 'en'
    ? 'en' : referrerSiteHint() || 'vi'
  try { sessionStorage.setItem(ENTRY_SITE_KEY, site) } catch { /* Optional hint. */ }
  return site
}

export function getMainSiteBase(lang) {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return window.location.origin
    }
  }
  return mainSiteOriginForLocale(lang)
}

export function mainSiteLink(page, lang) {
  return resolveMainSiteLink(page, lang, getMainSiteBase(lang))
}

/** The Structure app lives only on icue.vn. */
export function viOnlyLink(path, lang) {
  const normalized = path.replace(/^\//, '')
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return withLocale(`${window.location.origin}/${normalized}`, lang)
    }
  }
  return withLocale(`${SITES.vi}/${normalized}`, lang)
}

export function newsroomLink(lang) {
  return newsroomUrl(lang)
}

export function cleanSiteParams() {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('site') && !params.has('lang')) return
  const language = normalizeUiLocale(params.get('lang') || params.get('site'))
  params.delete('site')
  if (language) params.set('lang', language)
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState(window.history.state, '', next)
}
