/** Path routes for migrated main-site pages. */
export const ROUTE_PATHS = {
  home: '/',
  contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  /** Legacy news archive — same URL as the static file, served via React shell. */
  newsArchive: '/src/pages/News.html',
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

  const staticPage = (file) => `/src/pages/${file}.html`

  const hashToPath = {
    '#/Home': ROUTE_PATHS.home,
    '#/Contact': ROUTE_PATHS.contact,
    '#/aboutUs': ROUTE_PATHS.aboutUs,
    '#/ourWork': ROUTE_PATHS.ourWork,
    '#/pastProjects': ROUTE_PATHS.pastProjects,
    '#/recruitment': ROUTE_PATHS.recruitment,
    '#/News': '/newsroom/?from=vi-news',
    '#/orgStructure': '/structure/',
    '#/notableAwards': staticPage('notableAwards'),
    '#/communityActivities': staticPage('communityActivities'),
    '#/FAQs': staticPage('FAQs'),
    '#/faqs': staticPage('FAQs'),
    '#/donations': staticPage('donations'),
    '#/privacy': staticPage('privacy'),
    '#/terms': staticPage('terms'),
    '#/gdpr': staticPage('gdpr'),
    '#/cookies': staticPage('cookies'),
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

  return `${styles}${bodyHtml}`
}
