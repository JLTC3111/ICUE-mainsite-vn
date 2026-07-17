import { newsroomUrl, resolveMainSiteLink } from '../../../shared/site-routes/mainSitePaths.js'

export const SITES = {
  vi: 'https://icue.vn',
  en: 'https://en.icue.vn',
}

const ENTRY_SITE_KEY = 'icue_news_entry_site'

function isEnHost(hostname) {
  const host = hostname.toLowerCase()
  return host === 'en.icue.vn' || host.endsWith('.en.icue.vn')
}

function isViHost(hostname) {
  const host = hostname.toLowerCase()
  return host === 'icue.vn' || host === 'www.icue.vn'
}

/** Paths on icue.vn that are apps, not the VI marketing site. */
function isInternalAppPath(pathname) {
  return /^\/(newsroom|people|structure)(\/|$)/i.test(pathname || '')
}

/** Infer vi/en main site from document.referrer (ignores in-app navigations). */
export function referrerSiteHint() {
  try {
    const ref = document.referrer
    if (!ref) return null
    const url = new URL(ref)
    // Refresh / in-app links on newsroom must not force VI language.
    if (isInternalAppPath(url.pathname)) return null
    if (isEnHost(url.hostname)) return 'en'
    if (isViHost(url.hostname)) return 'vi'
  } catch {
    // ignore malformed referrer
  }
  return null
}

/** Capture entry-site hint once per session (referrer / ?site= / ?from=). */
export function detectEntrySite() {
  const cached = sessionStorage.getItem(ENTRY_SITE_KEY)
  if (cached === 'en' || cached === 'vi') return cached

  const params = new URLSearchParams(window.location.search)
  if (
    params.get('site') === 'en'
    || params.get('from') === 'en-news'
    || params.get('lang') === 'en'
  ) {
    sessionStorage.setItem(ENTRY_SITE_KEY, 'en')
    return 'en'
  }
  if (
    params.get('site') === 'vi'
    || params.get('from') === 'vi-news'
    || params.get('lang') === 'vi'
  ) {
    sessionStorage.setItem(ENTRY_SITE_KEY, 'vi')
    return 'vi'
  }

  const fromReferrer = referrerSiteHint()
  if (fromReferrer) {
    sessionStorage.setItem(ENTRY_SITE_KEY, fromReferrer)
    return fromReferrer
  }

  sessionStorage.setItem(ENTRY_SITE_KEY, 'vi')
  return 'vi'
}

export function getMainSiteBase(siteLang) {
  return siteLang === 'vi' ? SITES.vi : SITES.en
}

export function mainSiteLink(page, siteLang) {
  return resolveMainSiteLink(page, siteLang, getMainSiteBase(siteLang))
}

/** People app lives only on icue.vn — not on en.icue.vn. */
export function peopleSiteLink(path) {
  return `${SITES.vi}/people/${path}`
}

/** Structure app lives only on icue.vn — not on en.icue.vn. */
export function structureSiteLink(path = '') {
  const suffix = path ? `/${String(path).replace(/^\//, '')}` : '/'
  return `${SITES.vi}/structure${suffix === '/' ? '/' : suffix}`
}

export function newsroomLink(siteLang) {
  return newsroomUrl(siteLang)
}

export function cleanSiteParams() {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('site') && !params.has('from') && !params.has('lang')) return
  params.delete('site')
  params.delete('from')
  params.delete('lang')
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}
