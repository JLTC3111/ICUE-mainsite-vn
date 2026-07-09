export const SITES = {
  vi: 'https://icue.vn',
  en: 'https://en.icue.vn',
}

const staticPage = (file) => `/src/pages/${file}.html`

/** Path routes keyed by legacy page id. */
export const MAIN_SITE_PAGE_PATHS = {
  Home: '/',
  Contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  News: '/newsroom/',
  notableAwards: staticPage('notableAwards'),
  communityActivities: staticPage('communityActivities'),
  FAQs: staticPage('FAQs'),
  faqs: staticPage('FAQs'),
  donations: staticPage('donations'),
  privacy: staticPage('privacy'),
  terms: staticPage('terms'),
  gdpr: staticPage('gdpr'),
  cookies: staticPage('cookies'),
  orgStructure: '/structure/',
}

/** Pages served only on icue.vn when linking from en.icue.vn. */
const EN_CROSS_SITE_PAGES = new Set(['News', 'orgStructure'])

export function resolveMainSiteLink(page, lang, base) {
  const path = MAIN_SITE_PAGE_PATHS[page]
  if (!path) {
    return `${String(base).replace(/\/$/, '')}/#/${page}`
  }

  if (lang === 'en' && EN_CROSS_SITE_PAGES.has(page)) {
    return `${SITES.vi}${path}`
  }

  if (typeof base === 'string' && base.startsWith('http')) {
    return `${base.replace(/\/$/, '')}${path}`
  }

  return path
}
