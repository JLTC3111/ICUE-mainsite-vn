import {
  mainSiteOriginForLocale,
  newsroomUrl,
  resolveMainSiteLink,
  withLocale,
} from '../../../shared/site-routes/mainSitePaths.js'

export const SITES = {
  vi: 'https://icue.vn',
  en: 'https://en.icue.vn',
}

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

const ENTRY_SITE_KEY = 'icue_structure_entry_site'

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

/** People app lives only on icue.vn. */
export function peopleSiteLink(path, lang) {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return withLocale(`${window.location.origin}/people/${path}`, lang)
    }
  }
  return withLocale(`${SITES.vi}/people/${path}`, lang)
}

export function structureSiteLink(lang) {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return withLocale(`${window.location.origin}/structure/`, lang)
    }
  }
  return withLocale(`${SITES.vi}/structure/`, lang)
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
