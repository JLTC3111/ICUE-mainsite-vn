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

/** Infer vi/en main site from document.referrer. */
export function referrerSiteHint() {
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

/** Capture entry-site hint once per session (referrer / ?site= / ?from=en-news). */
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
  return `${getMainSiteBase(siteLang)}/#/${page}`
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
  return siteLang === 'vi' ? '/newsroom/' : '/newsroom/?from=en-news'
}

export function cleanSiteParams() {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('site')) return
  params.delete('site')
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}
