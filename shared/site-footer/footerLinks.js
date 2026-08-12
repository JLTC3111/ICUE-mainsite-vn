import { MAIN_SITE_PAGE_PATHS, withLocale } from '../site-routes/mainSitePaths.js'

function buildFooterLinks(locale) {
  const p = MAIN_SITE_PAGE_PATHS
  const links = {
    notableAwards: p.notableAwards,
    news: p.News,
    archive: '/news-archive',
    faqs: p.FAQs,
    recruitment: p.recruitment,
    privacy: p.privacy,
    terms: p.terms,
    gdpr: p.gdpr,
    cookies: p.cookies,
    contact: p.Contact,
  }

  return Object.fromEntries(
    Object.entries(links).map(([key, href]) => [key, withLocale(href, locale)]),
  )
}

/** @deprecated VN site no longer uses hash routing for footers. */
export function getHashFooterLinks(locale) {
  return buildFooterLinks(locale)
}

export function getStandaloneFooterLinks(locale) {
  return buildFooterLinks(locale)
}

export function getFooterLinks(linkMode = 'standalone', locale) {
  return buildFooterLinks(locale)
}
