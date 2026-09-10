export const SITES = {
  vi: 'https://icue.vn',
  en: 'https://en.icue.vn',
}

export const SUPPORTED_UI_LOCALES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']

const SUPPORTED_UI_LOCALE_SET = new Set(SUPPORTED_UI_LOCALES)
const LOCALE_ALIASES = {
  vn: 'vi',
  gb: 'en',
  uk: 'en',
  kr: 'ko',
  jp: 'ja',
}

/**
 * Turn browser/flag/country variants into the locale codes used by i18next.
 * `kr` and `jp` are accepted at URL boundaries even though the canonical
 * language codes stored by the apps are `ko` and `ja`.
 */
export function normalizeUiLocale(value, fallback = null) {
  const raw = String(value || '').trim().toLowerCase().replaceAll('_', '-')
  const base = raw.split('-')[0]
  const normalized = LOCALE_ALIASES[raw] || LOCALE_ALIASES[base] || base

  if (SUPPORTED_UI_LOCALE_SET.has(normalized)) return normalized
  if (fallback == null) return null

  const fallbackRaw = String(fallback || '').trim().toLowerCase().replaceAll('_', '-')
  const fallbackBase = fallbackRaw.split('-')[0]
  const normalizedFallback = LOCALE_ALIASES[fallbackRaw]
    || LOCALE_ALIASES[fallbackBase]
    || fallbackBase
  return SUPPORTED_UI_LOCALE_SET.has(normalizedFallback) ? normalizedFallback : 'vi'
}

/** English keeps its dedicated home host; every other localized home lives on icue.vn. */
export function mainSiteOriginForLocale(locale = 'vi') {
  return normalizeUiLocale(locale, 'vi') === 'en' ? SITES.en : SITES.vi
}

/**
 * Add or replace the explicit locale on an internal link without disturbing
 * its other query parameters or hash. This is the hand-off contract between
 * independently bootstrapped ICUE apps and therefore works across origins.
 */
export function withLocale(url, locale) {
  const normalized = normalizeUiLocale(locale)
  const value = String(url || '')
  if (!normalized || !value || value.startsWith('#')) return value
  if (/^(?:mailto|tel|sms|javascript):/i.test(value)) return value

  const hashAt = value.indexOf('#')
  const beforeHash = hashAt >= 0 ? value.slice(0, hashAt) : value
  const hash = hashAt >= 0 ? value.slice(hashAt) : ''
  const queryAt = beforeHash.indexOf('?')
  const path = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash
  const params = new URLSearchParams(queryAt >= 0 ? beforeHash.slice(queryAt + 1) : '')

  // `site=en` and `from=en-news` are retired language hints. Keep accepting
  // them at app entry points, but never carry them into newly generated URLs.
  params.delete('site')
  if (params.get('from') === 'en-news') params.delete('from')
  params.set('lang', normalized)
  return `${path}?${params.toString()}${hash}`
}

/** Newsroom is hosted only on icue.vn (not en.icue.vn). */
export const NEWSROOM_VI_URL = withLocale(`${SITES.vi}/newsroom/`, 'vi')
export const NEWSROOM_EN_URL = withLocale(`${SITES.vi}/newsroom/`, 'en')

export function newsroomUrl(lang = 'vi') {
  return withLocale(`${SITES.vi}/newsroom/`, lang)
}

function normalizedPathname(pathname) {
  const raw = String(pathname || '/')
  if (raw.length > 1) return raw.replace(/\/+$/, '')
  return raw || '/'
}

/**
 * Absolute icue.vn URL for a path. Vietnamese is the unmarked default, so it
 * omits `?lang=` and matches the sitemap `<loc>`. Every other UI language
 * carries `?lang=` so a copied link opens in that locale.
 */
export function absoluteLocaleUrl(pathname, locale = 'vi') {
  const path = normalizedPathname(pathname)
  const href = `${SITES.vi}${path === '/' ? '/' : path}`
  const code = normalizeUiLocale(locale, 'vi')
  return code === 'vi' ? href : withLocale(href, code)
}

export function hreflangAlternates(pathname) {
  const entries = SUPPORTED_UI_LOCALES.map((lang) => ({
    hreflang: lang,
    href: absoluteLocaleUrl(pathname, lang),
  }))
  entries.push({ hreflang: 'x-default', href: absoluteLocaleUrl(pathname, 'vi') })
  return entries
}

export function hreflangLinkTags(pathname) {
  return hreflangAlternates(pathname)
    .map(({ hreflang, href }) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
    .join('\n    ')
}

/** Path routes keyed by legacy page id. */
export const MAIN_SITE_PAGE_PATHS = {
  Home: '/',
  Contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  newsArchive: '/news-archive',
  recruitment: '/recruitment',
  News: '/newsroom/',
  meetOurExperts: '/people/experts',
  coreTeam: '/people/core-team',
  notableAwards: '/notable-awards',
  communityActivities: '/community-activities',
  FAQs: '/faqs',
  faqs: '/faqs',
  privacy: '/legal/privacy',
  terms: '/legal/terms',
  gdpr: '/legal/gdpr',
  cookies: '/legal/cookies',
  orgStructure: '/structure/',
}

/**
 * Pages served from icue.vn, regardless of UI language, so every app's
 * link to them points at this host with `?lang=` carrying the reader's choice.
 *
 * Home is the only route that keeps a dedicated English host. Every subpage is
 * implemented once in this repository, either by home-app or a standalone
 * React app. Keeping this ownership list explicit prevents any English link
 * from drifting back to a retired en.icue.vn subpath.
 */
export const ICUE_VN_HOSTED_PAGES = new Set(
  Object.keys(MAIN_SITE_PAGE_PATHS).filter((page) => page !== 'Home'),
)

/** @deprecated Use ICUE_VN_HOSTED_PAGES; retained for compatibility. */
export const VI_ONLY_APP_PAGES = ICUE_VN_HOSTED_PAGES

const DETAIL_PAGES = new Set(['pastProjects', 'newsArchive'])

/**
 * Keep `/past-projects/:id` and `/news-archive/:id` intact when the reader
 * is already on a detail route. Listing pages and every other page resolve
 * to their canonical path.
 */
export function hostedPathForPage(page, currentPathname = '') {
  const path = MAIN_SITE_PAGE_PATHS[page]
  if (!path) return null

  const current = String(currentPathname || '').replace(/\/+$/, '') || ''
  if (DETAIL_PAGES.has(page) && (current === path || current.startsWith(`${path}/`))) {
    return current
  }
  return path
}

export function resolveMainSiteDetailLink(page, id, lang) {
  const locale = normalizeUiLocale(lang, 'vi')
  const path = MAIN_SITE_PAGE_PATHS[page]
  if (!path) return resolveMainSiteLink(page, locale)
  if (id == null || id === '') return resolveMainSiteLink(page, locale)
  return withLocale(`${SITES.vi}${path}/${encodeURIComponent(id)}`, locale)
}

export function resolveMainSiteLink(page, lang, base, currentPathname) {
  const locale = normalizeUiLocale(lang, 'vi')
  const origin = typeof base === 'string' && base.startsWith('http')
    ? base.replace(/\/$/, '')
    : mainSiteOriginForLocale(locale)

  const path = hostedPathForPage(page, currentPathname)
  if (!path) {
    return withLocale(`${SITES.vi}/#/${page}`, locale)
  }

  if (ICUE_VN_HOSTED_PAGES.has(page)) {
    return withLocale(`${SITES.vi}${path}`, locale)
  }

  return withLocale(`${origin}${path}`, locale)
}
