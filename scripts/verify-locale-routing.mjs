import assert from 'node:assert/strict'
import {
  mainSiteOriginForLocale,
  normalizeUiLocale,
  resolveMainSiteLink,
  SUPPORTED_UI_LOCALES,
  withLocale,
} from '../shared/site-routes/mainSitePaths.js'

/*
 * Every destination a standalone app links to. Keep this in step with the apps
 * themselves: a page missing here is silently unverified — the loop below only
 * ever asserts about the values in this map.
 */
const APPS = {
  Home: 'Home',
  Structure: 'orgStructure',
  'Our Work': 'ourWork',
  News: 'News',
  Contact: 'Contact',
  FAQs: 'FAQs',
  Recruitment: 'recruitment',
  Community: 'communityActivities',
  Privacy: 'privacy',
  Terms: 'terms',
  GDPR: 'gdpr',
  Cookies: 'cookies',
}
// People uses the same resolver for its custom footer but is not itself a
// MAIN_SITE_PAGE_PATHS destination, so keep it in the source matrix only.
const APP_SOURCES = [...Object.keys(APPS), 'People']

let verifiedTransitions = 0

for (const source of APP_SOURCES) {
  for (const [destination, page] of Object.entries(APPS)) {
    for (const locale of SUPPORTED_UI_LOCALES) {
      const href = resolveMainSiteLink(
        page,
        locale,
        mainSiteOriginForLocale(locale),
      )
      const url = new URL(href, 'https://icue.vn')

      assert.equal(
        url.searchParams.get('lang'),
        locale,
        `${source} -> ${destination} must preserve ${locale}`,
      )

      // Must mirror VI_ONLY_APP_PAGES in shared/site-routes/mainSitePaths.js.
      if (['News', 'orgStructure', 'ourWork', 'Contact', 'FAQs', 'faqs', 'recruitment',
        'communityActivities', 'privacy', 'terms', 'gdpr', 'cookies'].includes(page)) {
        assert.equal(url.origin, 'https://icue.vn')
      } else {
        assert.equal(url.origin, mainSiteOriginForLocale(locale))
      }

      verifiedTransitions += 1
    }
  }
}

assert.equal(normalizeUiLocale('kr'), 'ko')
assert.equal(normalizeUiLocale('ko-KR'), 'ko')
assert.equal(normalizeUiLocale('jp'), 'ja')
assert.equal(normalizeUiLocale('ja-JP'), 'ja')
assert.equal(
  withLocale('/newsroom/?from=en-news#latest', 'de'),
  '/newsroom/?from=en-news&lang=de#latest',
)
assert.equal(withLocale('/contact?lang=vi', 'fr'), '/contact?lang=fr')

console.log(`Verified ${verifiedTransitions} locale-preserving app transitions.`)
