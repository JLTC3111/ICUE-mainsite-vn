import { MAIN_SITE_PAGE_PATHS } from '../site-routes/mainSitePaths.js'

function buildFooterLinks() {
  const p = MAIN_SITE_PAGE_PATHS
  return {
    notableAwards: p.notableAwards,
    communityActivities: p.communityActivities,
    news: p.News,
    archive: '/news-archive',
    faqs: p.FAQs,
    recruitment: p.recruitment,
    donations: p.donations,
    privacy: p.privacy,
    terms: p.terms,
    gdpr: p.gdpr,
    cookies: p.cookies,
    contact: p.Contact,
  }
}

/** @deprecated VN site no longer uses hash routing for footers. */
export function getHashFooterLinks() {
  return buildFooterLinks()
}

export function getStandaloneFooterLinks() {
  return buildFooterLinks()
}

export function getFooterLinks(linkMode = 'standalone') {
  return buildFooterLinks()
}
