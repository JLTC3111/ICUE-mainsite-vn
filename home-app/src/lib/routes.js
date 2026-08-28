/** Path routes for migrated main-site pages. */
import { newsroomUrl, withLocale } from '../../../shared/site-routes/mainSitePaths.js'

export const ROUTE_PATHS = {
  home: '/',
  contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  /** Legacy news archive content rendered inside the React shell. */
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
 * Legacy pages this SPA still injects. Contact, Our Work, Structure, the FAQs,
 * recruitment, community activities and the four legal documents are absent
 * because each is served by a dedicated app. Links to them are still rewritten
 * by `hashToPath`.
 */
export const LEGACY_PAGE_FILES = {
  aboutUs: 'aboutUs.html',
  pastProjects: 'pastProjects.html',
  newsArchive: 'News.html',
  notableAwards: 'notableAwards.html',
}

/**
 * Paths that still render a legacy HTML page whose canonical route has already
 * moved to JSX. Deliberately kept out of PATH_TO_PAGE: PAGE_TO_PATH inverts that
 * map, and a second path for the same page id would hijack the canonical one
 * when links get rewritten.
 *
 * `/about-us-legacy` exists so the old page stays reachable for comparison while
 * AboutUsPage beds in. Remove it — and the route in App.jsx — once the JSX page
 * is trusted; legacy/pages/aboutUs.html can go at the same time.
 */
export const LEGACY_PREVIEW_PATHS = {
  '/about-us-legacy': 'aboutUs',
}

/**
 * Routes on icue.vn that serve all six UI languages, English included.
 *
 * Everywhere else on this host is the Vietnamese site and English means
 * en.icue.vn. About is the exception because there is now exactly one About
 * page: en.icue.vn/about-us redirects here, so this route has to be able to
 * answer in English or the redirect would hand an English reader a Vietnamese
 * page. It is the same arrangement Contact, Our Work and the newsroom already
 * have — see VI_ONLY_APP_PAGES in shared/site-routes/mainSitePaths.js, which is
 * what points every other app's About link at this host.
 *
 * Two things read this: detectLanguage, so a stored or requested `en` is
 * honoured here and nowhere else, and SiteLanguageMenu, so picking English here
 * re-renders instead of bouncing out to en.icue.vn and straight back.
 */
export const SHARED_LOCALE_PATHS = [ROUTE_PATHS.aboutUs]

export function servesAllLocales(pathname = window.location.pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return SHARED_LOCALE_PATHS.includes(normalized)
}

export function pageFromPathname(pathname) {
  return PATH_TO_PAGE[pathname] || LEGACY_PREVIEW_PATHS[pathname] || null
}

export function pathFromPage(page) {
  return PAGE_TO_PATH[page] || ROUTE_PATHS.home
}

/** Rewrite legacy hash links and public/ asset paths inside injected HTML. */
export function prepareLegacyHtml(rawHtml, locale) {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  // Scope document-level selectors so injected page CSS cannot clip fixed nav/footer
  // (mobile WebKit clips position:fixed when html/body have overflow-x:hidden).
  const styles = [...doc.querySelectorAll('style')]
    .map((el) => {
      let css = el.textContent || ''
      css = css
        .replace(/(^|[,}\s])html(\s*[,{])/g, '$1:root$2')
        .replace(/(^|[,}\s])body(\s*[,{])/g, '$1.legacy-page$2')
        // Only rewrite a bare universal reset (`* {`), not descendant `svg *` etc.
        .replace(/(^|})\s*\*\s*\{/g, '$1.legacy-page, .legacy-page * {')
      return `<style>${css}</style>`
    })
    .join('\n')
  let bodyHtml = doc.body?.innerHTML || rawHtml
  // Scripts in injected legacy HTML are handled by pageInit modules — drop CDN fallbacks.
  bodyHtml = bodyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  bodyHtml = bodyHtml.replace(/<link[^>]+swiper-bundle\.min\.css[^>]*>/gi, '')

  const hashToPath = {
    '#/Home': ROUTE_PATHS.home,
    '#/Contact': ROUTE_PATHS.contact,
    '#/aboutUs': ROUTE_PATHS.aboutUs,
    '#/ourWork': ROUTE_PATHS.ourWork,
    '#/pastProjects': ROUTE_PATHS.pastProjects,
    '#/recruitment': ROUTE_PATHS.recruitment,
    '#/News': newsroomUrl('vi'),
    '#/orgStructure': '/structure/',
    '#/notableAwards': ROUTE_PATHS.notableAwards,
    '#/communityActivities': ROUTE_PATHS.communityActivities,
    '#/FAQs': ROUTE_PATHS.faqs,
    '#/faqs': ROUTE_PATHS.faqs,
    '#/privacy': ROUTE_PATHS.privacy,
    '#/terms': ROUTE_PATHS.terms,
    '#/gdpr': ROUTE_PATHS.gdpr,
    '#/cookies': ROUTE_PATHS.cookies,
  }

  // Only rewrite relative `public/...` paths. Absolute `/public/...` must stay intact
  // (a naive `\bpublic/` replace turns `/public/` into protocol-relative `//public/`).
  bodyHtml = bodyHtml
    .replace(/(["'(=\s])public\//g, '$1/public/')
    .replace(/(^|[^:/])\/{2,}public\//g, '$1/public/')
  for (const [hash, path] of Object.entries(hashToPath)) {
    const localizedPath = withLocale(path, locale)
    bodyHtml = bodyHtml.replaceAll(`href="${hash}"`, `href="${localizedPath}"`)
    bodyHtml = bodyHtml.replaceAll(`href='${hash}'`, `href='${localizedPath}'`)
    bodyHtml = bodyHtml.replaceAll(`href="/${hash.slice(1)}"`, `href="${localizedPath}"`)
    bodyHtml = bodyHtml.replaceAll(`href='/${hash.slice(1)}'`, `href='${localizedPath}'`)
  }

  for (const [pageId, file] of Object.entries(LEGACY_PAGE_FILES)) {
    const route = PAGE_TO_PATH[pageId]
    if (!route) continue
    const localizedRoute = withLocale(route, locale)
    bodyHtml = bodyHtml.replaceAll(`href="/src/pages/${file}"`, `href="${localizedRoute}"`)
    bodyHtml = bodyHtml.replaceAll(`href='/src/pages/${file}'`, `href='${localizedRoute}'`)
  }

  // A few legacy pages contain absolute app URLs rather than their old hash
  // equivalents. Localize those too so they cannot bypass the app hand-off.
  bodyHtml = bodyHtml.replace(
    /href=(["'])(https:\/\/icue\.vn\/newsroom\/?[^"']*)\1/gi,
    (_match, quote, href) => `href=${quote}${withLocale(href, locale)}${quote}`,
  )

  // Newsroom lives on icue.vn only — rewrite relative links for en.icue.vn visitors.
  bodyHtml = bodyHtml.replace(/href="(\/newsroom\/[^"]*)"/g, `href="https://icue.vn$1"`)
  bodyHtml = bodyHtml.replace(/href='(\/newsroom\/[^']*)'/g, `href='https://icue.vn$1'`)

  return `${styles}${bodyHtml}`
}
