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

const ENTRY_SITE_KEY = 'icue_people_entry_site'

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
    // ignore malformed referrer
  }
  return null
}

/** Capture entry-site hint once per session (referrer / ?site=). */
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
  return mainSiteOriginForLocale(lang)
}

export function mainSiteLink(page, lang) {
  return resolveMainSiteLink(page, lang, getMainSiteBase(lang))
}

/** Structure app lives only on icue.vn. */
export function structureSiteLink(path = '', locale) {
  const suffix = path ? `/${String(path).replace(/^\//, '')}` : '/'
  return withLocale(`${SITES.vi}/structure${suffix === '/' ? '/' : suffix}`, locale)
}

export function peopleSiteLink(path = '', locale) {
  const suffix = path ? `/${String(path).replace(/^\//, '')}` : '/'
  return withLocale(`${SITES.vi}/people${suffix === '/' ? '/' : suffix}`, locale)
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
