export const SITES = {
  vi: 'https://icue.vn',
  en: 'https://en.icue.vn',
}

/** Newsroom is hosted only on icue.vn (not en.icue.vn). */
export const NEWSROOM_VI_URL = `${SITES.vi}/newsroom/?from=vi-news`
export const NEWSROOM_EN_URL = `${SITES.vi}/newsroom/?from=en-news`

export function newsroomUrl(lang = 'vi') {
  return lang === 'en' ? NEWSROOM_EN_URL : NEWSROOM_VI_URL
}

/** Path routes keyed by legacy page id. */
export const MAIN_SITE_PAGE_PATHS = {
  Home: '/',
  Contact: '/contact',
  aboutUs: '/about-us',
  ourWork: '/our-work',
  pastProjects: '/past-projects',
  recruitment: '/recruitment',
  News: '/newsroom/?from=vi-news',
  notableAwards: '/notable-awards',
  communityActivities: '/community-activities',
  FAQs: '/faqs',
  faqs: '/faqs',
  privacy: '/privacy',
  terms: '/terms',
  gdpr: '/gdpr',
  cookies: '/cookies',
  orgStructure: '/structure/',
}

/** Pages served only on icue.vn when linking from en.icue.vn. */
const EN_CROSS_SITE_PAGES = new Set(['News', 'orgStructure'])

export function resolveMainSiteLink(page, lang, base) {
  if (page === 'News') {
    return newsroomUrl(lang)
  }

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
