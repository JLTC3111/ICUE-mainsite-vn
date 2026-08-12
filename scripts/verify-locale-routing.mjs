import assert from 'node:assert/strict'
import {
  mainSiteOriginForLocale,
  normalizeUiLocale,
  resolveMainSiteLink,
  SUPPORTED_UI_LOCALES,
  withLocale,
} from '../shared/site-routes/mainSitePaths.js'

const APPS = {
  Home: 'Home',
  Structure: 'orgStructure',
  'Our Work': 'ourWork',
  News: 'News',
  Contact: 'Contact',
}

let verifiedTransitions = 0

for (const source of Object.keys(APPS)) {
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

      if (['News', 'orgStructure', 'ourWork', 'Contact'].includes(page)) {
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
