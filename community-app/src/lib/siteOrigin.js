import {
  mainSiteOriginForLocale,
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

const ENTRY_SITE_KEY = 'icue_community_entry_site'

/**
 * The app is served from icue.vn only, but en.icue.vn links into it. Remember
 * which site the visitor came from so chrome links send them back there.
 */
export function detectEntrySite() {
  const cached = sessionStorage.getItem(ENTRY_SITE_KEY)
  if (cached === 'en' || cached === 'vi') return cached

  const params = new URLSearchParams(window.location.search)
  if (params.get('site') === 'en') {
    sessionStorage.setItem(ENTRY_SITE_KEY, 'en')
    return 'en'
  }

  const fromReferrer = referrerSiteHint()
  if (fromReferrer) {
    sessionStorage.setItem(ENTRY_SITE_KEY, fromReferrer)
    return fromReferrer
  }

  sessionStorage.setItem(ENTRY_SITE_KEY, 'vi')
  return 'vi'
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
  params.delete('site')
  params.delete('lang')
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}
