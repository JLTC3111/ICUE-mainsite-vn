export const ROUTE_PATHS = {
  home: '/',
  contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  /** News archive listing and `/news-archive/:id` article pages. */
  newsArchive: '/news-archive',
  notableAwards: '/notable-awards',
  communityActivities: '/community-activities',
  faqs: '/faqs',
  privacy: '/legal/privacy',
  terms: '/legal/terms',
  gdpr: '/legal/gdpr',
  cookies: '/legal/cookies',
}

/** Maps React path -> legacy page id used by script.js init + nav state. */
export const PATH_TO_PAGE = {
  [ROUTE_PATHS.home]: 'Home',
  [ROUTE_PATHS.contact]: 'Contact',
  [ROUTE_PATHS.aboutUs]: 'aboutUs',
  [ROUTE_PATHS.ourWork]: 'ourWork',
  [ROUTE_PATHS.pastProjects]: 'pastProjects',
  [ROUTE_PATHS.newsArchive]: 'newsArchive',
  [ROUTE_PATHS.notableAwards]: 'notableAwards',
  [ROUTE_PATHS.privacy]: 'privacy',
  [ROUTE_PATHS.terms]: 'terms',
  [ROUTE_PATHS.gdpr]: 'gdpr',
  [ROUTE_PATHS.cookies]: 'cookies',
}

export const PAGE_TO_PATH = Object.fromEntries(
  Object.entries(PATH_TO_PAGE).map(([path, page]) => [page, path]),
)

/**
 * Home-app routes on icue.vn that serve all six UI languages, English included.
 * Home remains the sole route whose English selection crosses to en.icue.vn.
 * Every subpage is canonical here, including project/article detail routes.
 *
 * Two things read this: detectLanguage, so a stored or requested `en` is
 * honoured on these paths, and SiteLanguageMenu, so picking English re-renders
 * in place instead of navigating to a retired English-host subpath.
 */
export const SHARED_LOCALE_PATHS = Object.values(ROUTE_PATHS).filter(
  (path) => path !== ROUTE_PATHS.home,
)

/**
 * Hash bookmarks still used by old home-app URLs. Locale detection runs during
 * i18n import, before main.jsx can rewrite these, so the hash has to count as
 * the destination path — otherwise `/?lang=en#/aboutUs` is treated as Home and
 * English is dropped.
 */
export const HOME_APP_HASH_PATHS = {
  '#/Home': '/',
  '#/aboutUs': '/about-us',
  '#/News': '/news-archive',
  '#/newsArchive': '/news-archive',
  '#/pastProjects': '/past-projects',
  '#/notableAwards': '/notable-awards',
}

function normalizePathname(pathname) {
  const value = String(pathname || '/')
  return value.length > 1 ? value.replace(/\/+$/, '') : value
}

export function pathnameForLocaleDetection(location) {
  const loc = location || (typeof window !== 'undefined' ? window.location : { pathname: '/', hash: '' })
  return HOME_APP_HASH_PATHS[loc.hash] || normalizePathname(loc.pathname)
}

export function servesAllLocales(pathname) {
  const normalized = normalizePathname(
    pathname == null ? pathnameForLocaleDetection() : pathname,
  )
  return normalized !== '/' && normalized !== ''
}

export function pageFromPathname(pathname) {
  const normalized = normalizePathname(pathname)
  if (PATH_TO_PAGE[pathname] || PATH_TO_PAGE[normalized]) {
    return PATH_TO_PAGE[pathname] || PATH_TO_PAGE[normalized]
  }
  if (normalized.startsWith(`${ROUTE_PATHS.pastProjects}/`)) return 'pastProjects'
  if (normalized.startsWith(`${ROUTE_PATHS.newsArchive}/`)) return 'newsArchive'
  return null
}

export function pathFromPage(page) {
  return PAGE_TO_PATH[page] || ROUTE_PATHS.home
}
