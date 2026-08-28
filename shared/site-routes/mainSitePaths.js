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

/** English keeps its dedicated host; every other localized home lives on icue.vn. */
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

  params.set('lang', normalized)
  return `${path}?${params.toString()}${hash}`
}

/** Newsroom is hosted only on icue.vn (not en.icue.vn). */
export const NEWSROOM_VI_URL = withLocale(`${SITES.vi}/newsroom/`, 'vi')
export const NEWSROOM_EN_URL = withLocale(`${SITES.vi}/newsroom/`, 'en')

export function newsroomUrl(lang = 'vi') {
  return withLocale(`${SITES.vi}/newsroom/`, lang)
}

/** Path routes keyed by legacy page id. */
export const MAIN_SITE_PAGE_PATHS = {
  Home: '/',
  Contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  News: '/newsroom/',
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
 * Pages served only from icue.vn, regardless of UI language, so every app's
 * link to them points at this host with `?lang=` carrying the reader's choice.
 *
 * The first four are standalone apps that were never built for en.icue.vn.
 * `aboutUs` joins them for a different reason: it used to exist twice, once per
 * host, and now exists once — the icue.vn copy renders all six languages and
 * en.icue.vn/about-us redirects to it.
 *
 * `FAQs` and `recruitment` are the same case as aboutUs. Until they became
 * their own apps they were Vietnamese-only pages injected into home-app, and a
 * reader who picked English on either was sent to en.icue.vn — a host this
 * repository does not build, which is where people-app's and structure-app's
 * footers were pointing English readers. Both now render all six languages
 * here. `FAQs` and `faqs` are both listed because MAIN_SITE_PAGE_PATHS carries
 * the id in both casings and callers use either.
 */
const VI_ONLY_APP_PAGES = new Set([
  'News',
  'orgStructure',
  'ourWork',
  'Contact',
  'aboutUs',
  'FAQs',
  'faqs',
  'recruitment',
  'communityActivities',
])

export function resolveMainSiteLink(page, lang, base) {
  const locale = normalizeUiLocale(lang, 'vi')

  if (page === 'News') {
    return newsroomUrl(locale)
  }

  const path = MAIN_SITE_PAGE_PATHS[page]
  if (!path) {
    return withLocale(`${String(base).replace(/\/$/, '')}/#/${page}`, locale)
  }

  if (VI_ONLY_APP_PAGES.has(page)) {
    return withLocale(`${SITES.vi}${path}`, locale)
  }

  if (typeof base === 'string' && base.startsWith('http')) {
    return withLocale(`${base.replace(/\/$/, '')}${path}`, locale)
  }

  return withLocale(path, locale)
}
