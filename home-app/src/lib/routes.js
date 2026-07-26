/** Path routes for migrated main-site pages. */
import { newsroomUrl } from '../../../shared/site-routes/mainSitePaths.js'

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
  privacy: '/privacy',
  terms: '/terms',
  gdpr: '/gdpr',
  cookies: '/cookies',
}

/** Maps React path -> legacy page id used by script.js init + nav state. */
export const PATH_TO_PAGE = {
  [ROUTE_PATHS.home]: 'Home',
  [ROUTE_PATHS.contact]: 'Contact',
  [ROUTE_PATHS.aboutUs]: 'aboutUs',
  [ROUTE_PATHS.ourWork]: 'ourWork',
  [ROUTE_PATHS.pastProjects]: 'pastProjects',
  [ROUTE_PATHS.recruitment]: 'recruitment',
  [ROUTE_PATHS.newsArchive]: 'newsArchive',
  [ROUTE_PATHS.notableAwards]: 'notableAwards',
  [ROUTE_PATHS.communityActivities]: 'communityActivities',
  [ROUTE_PATHS.faqs]: 'FAQs',
  [ROUTE_PATHS.privacy]: 'privacy',
  [ROUTE_PATHS.terms]: 'terms',
  [ROUTE_PATHS.gdpr]: 'gdpr',
  [ROUTE_PATHS.cookies]: 'cookies',
}

export const PAGE_TO_PATH = Object.fromEntries(
  Object.entries(PATH_TO_PAGE).map(([path, page]) => [page, path]),
)

export const LEGACY_PAGE_FILES = {
  Contact: 'Contact.html',
  aboutUs: 'aboutUs.html',
  ourWork: 'ourWork.html',
  pastProjects: 'pastProjects.html',
  recruitment: 'recruitment.html',
  newsArchive: 'News.html',
  notableAwards: 'notableAwards.html',
  communityActivities: 'communityActivities.html',
  FAQs: 'FAQs.html',
  privacy: 'privacy.html',
  terms: 'terms.html',
  gdpr: 'gdpr.html',
  cookies: 'cookies.html',
}

export function pageFromPathname(pathname) {
  return PATH_TO_PAGE[pathname] || null
}

export function pathFromPage(page) {
  return PAGE_TO_PATH[page] || ROUTE_PATHS.home
}

/** Rewrite legacy hash links and public/ asset paths inside injected HTML. */
export function prepareLegacyHtml(rawHtml) {
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
    bodyHtml = bodyHtml.replaceAll(`href="${hash}"`, `href="${path}"`)
    bodyHtml = bodyHtml.replaceAll(`href='${hash}'`, `href='${path}'`)
    bodyHtml = bodyHtml.replaceAll(`href="/${hash.slice(1)}"`, `href="${path}"`)
    bodyHtml = bodyHtml.replaceAll(`href='/${hash.slice(1)}'`, `href='${path}'`)
  }

  for (const [pageId, file] of Object.entries(LEGACY_PAGE_FILES)) {
    const route = PAGE_TO_PATH[pageId]
    if (!route) continue
    bodyHtml = bodyHtml.replaceAll(`href="/src/pages/${file}"`, `href="${route}"`)
    bodyHtml = bodyHtml.replaceAll(`href='/src/pages/${file}'`, `href='${route}'`)
  }

  // Newsroom lives on icue.vn only — rewrite relative links for en.icue.vn visitors.
  bodyHtml = bodyHtml.replace(/href="(\/newsroom\/[^"]*)"/g, `href="https://icue.vn$1"`)
  bodyHtml = bodyHtml.replace(/href='(\/newsroom\/[^']*)'/g, `href='https://icue.vn$1'`)

  return `${styles}${bodyHtml}`
}
