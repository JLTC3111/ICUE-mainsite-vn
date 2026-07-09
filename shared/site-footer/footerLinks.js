const MAIN = '/'

/** Hash-based links (newsroom / legacy main site). */
export function getHashFooterLinks() {
  return {
    notableAwards: `${MAIN}#/notableAwards`,
    communityActivities: `${MAIN}#/communityActivities`,
    news: '/newsroom/',
    archive: `${MAIN}#/News`,
    faqs: `${MAIN}#/FAQs`,
    recruitment: `${MAIN}#/recruitment`,
    donations: `${MAIN}#/donations`,
    privacy: `${MAIN}#/privacy`,
    terms: `${MAIN}#/terms`,
    gdpr: `${MAIN}#/gdpr`,
    cookies: `${MAIN}#/cookies`,
    contact: `${MAIN}#/Contact`,
  }
}

/** Path-based links for the standalone home app where routes exist. */
export function getStandaloneFooterLinks() {
  return {
    notableAwards: `${MAIN}#/notableAwards`,
    communityActivities: `${MAIN}#/communityActivities`,
    news: '/newsroom/',
    archive: `${MAIN}#/News`,
    faqs: `${MAIN}#/FAQs`,
    recruitment: '/recruitment',
    donations: `${MAIN}#/donations`,
    privacy: `${MAIN}#/privacy`,
    terms: `${MAIN}#/terms`,
    gdpr: `${MAIN}#/gdpr`,
    cookies: `${MAIN}#/cookies`,
    contact: '/contact',
  }
}

export function getFooterLinks(linkMode = 'hash') {
  return linkMode === 'standalone' ? getStandaloneFooterLinks() : getHashFooterLinks()
}
