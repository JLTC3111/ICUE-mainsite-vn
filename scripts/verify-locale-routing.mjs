import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  hostedPathForPage,
  ICUE_VN_HOSTED_PAGES,
  mainSiteOriginForLocale,
  MAIN_SITE_PAGE_PATHS,
  normalizeUiLocale,
  resolveMainSiteDetailLink,
  resolveMainSiteLink,
  SUPPORTED_UI_LOCALES,
  VI_ONLY_APP_PAGES,
  absoluteLocaleUrl,
  hreflangAlternates,
  withLocale,
} from '../shared/site-routes/mainSitePaths.js'
import {
  HOME_APP_HASH_PATHS,
  pathnameForLocaleDetection,
  servesAllLocales,
} from '../home-app/src/lib/routes.js'

/*
 * Every destination a standalone app links to. Keep this in step with the apps
 * themselves: a page missing here is silently unverified — the loop below only
 * ever asserts about the values in this map.
 */
const APPS = {
  Home: 'Home',
  'About Us': 'aboutUs',
  'Notable Awards': 'notableAwards',
  Structure: 'orgStructure',
  'Our Work': 'ourWork',
  News: 'News',
  'News Archive': 'newsArchive',
  'Past Projects': 'pastProjects',
  Contact: 'Contact',
  FAQs: 'FAQs',
  Recruitment: 'recruitment',
  Community: 'communityActivities',
  Experts: 'meetOurExperts',
  'Core Team': 'coreTeam',
  Privacy: 'privacy',
  Terms: 'terms',
  GDPR: 'gdpr',
  Cookies: 'cookies',
}
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
      assert.equal(url.searchParams.get('site'), null, `${source} -> ${destination} must not emit site=`)
      assert.notEqual(url.searchParams.get('from'), 'en-news', `${source} -> ${destination} must not emit from=en-news`)

      if (page === 'Home') {
        assert.equal(url.origin, mainSiteOriginForLocale(locale))
      } else {
        assert.equal(url.origin, 'https://icue.vn')
        assert.ok(VI_ONLY_APP_PAGES.has(page) && ICUE_VN_HOSTED_PAGES.has(page))
      }

      verifiedTransitions += 1
      if (page === 'notableAwards') {
        assert.equal(url.pathname, '/notable-awards', 'Awards must retain its canonical path in every locale')
      }
    }
  }
}

for (const locale of SUPPORTED_UI_LOCALES) {
  assert.equal(
    new URL(resolveMainSiteLink('Home', locale)).origin,
    locale === 'en' ? 'https://en.icue.vn' : 'https://icue.vn',
    `Home must cross domains only for English, not ${locale}`,
  )
}

assert.equal(hostedPathForPage('pastProjects', '/past-projects/12'), '/past-projects/12')
assert.equal(hostedPathForPage('newsArchive', '/news-archive/4'), '/news-archive/4')
assert.equal(
  resolveMainSiteLink('pastProjects', 'en', undefined, '/past-projects/12'),
  'https://icue.vn/past-projects/12?lang=en',
)
assert.equal(
  resolveMainSiteLink('newsArchive', 'ja', undefined, '/news-archive/4'),
  'https://icue.vn/news-archive/4?lang=ja',
)
assert.equal(
  resolveMainSiteDetailLink('pastProjects', 3, 'en'),
  'https://icue.vn/past-projects/3?lang=en',
)
assert.equal(
  resolveMainSiteDetailLink('newsArchive', 8, 'fr'),
  'https://icue.vn/news-archive/8?lang=fr',
)

assert.equal(normalizeUiLocale('kr'), 'ko')
assert.equal(normalizeUiLocale('ko-KR'), 'ko')
assert.equal(normalizeUiLocale('jp'), 'ja')
assert.equal(normalizeUiLocale('ja-JP'), 'ja')
assert.equal(
  withLocale('/newsroom/?from=en-news&site=en#latest', 'de'),
  '/newsroom/?lang=de#latest',
)
assert.equal(withLocale('/contact?lang=vi', 'fr'), '/contact?lang=fr')
assert.equal(MAIN_SITE_PAGE_PATHS.Home, '/')

assert.equal(pathnameForLocaleDetection({ pathname: '/', hash: '#/aboutUs' }), '/about-us')
assert.equal(
  absoluteLocaleUrl('/news-archive/4', 'vi'),
  'https://icue.vn/news-archive/4',
)
assert.equal(
  absoluteLocaleUrl('/news-archive/4', 'ja'),
  'https://icue.vn/news-archive/4?lang=ja',
)
assert.equal(
  absoluteLocaleUrl('/news-archive', 'en'),
  'https://icue.vn/news-archive?lang=en',
)
assert.deepEqual(
  hreflangAlternates('/news-archive/4').map((entry) => entry.hreflang),
  [...SUPPORTED_UI_LOCALES, 'x-default'],
)
assert.equal(
  hreflangAlternates('/news-archive/4').find((entry) => entry.hreflang === 'x-default')?.href,
  'https://icue.vn/news-archive/4',
)

assert.equal(pathnameForLocaleDetection({ pathname: '/', hash: '#/News' }), '/news-archive')
assert.equal(pathnameForLocaleDetection({ pathname: '/', hash: '#/Home' }), '/')
assert.equal(pathnameForLocaleDetection({ pathname: '/about-us/', hash: '' }), '/about-us')
assert.equal(servesAllLocales(pathnameForLocaleDetection({ pathname: '/', hash: '#/aboutUs' })), true)
assert.equal(servesAllLocales(pathnameForLocaleDetection({ pathname: '/', hash: '#/Home' })), false)
assert.equal(servesAllLocales('/'), false)
assert.equal(servesAllLocales('/past-projects/12'), true)
assert.equal(HOME_APP_HASH_PATHS['#/notableAwards'], '/notable-awards')

function collectKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.keys(value).flatMap((key) => (
    collectKeys(value[key], prefix ? `${prefix}.${key}` : key)
  ))
}

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '../home-app/src/locales')
const awardsKeysByLocale = {}
for (const locale of SUPPORTED_UI_LOCALES) {
  const json = JSON.parse(readFileSync(join(localesDir, `${locale}.json`), 'utf8'))
  assert.equal(typeof json.awards, 'object', `${locale}.json must ship awards copy`)
  assert.equal(json.awards.language, locale, `${locale} awards.language must match the file`)
  awardsKeysByLocale[locale] = collectKeys(json.awards).sort()
}

const expectedAwardsKeys = awardsKeysByLocale.vi
const metaKeysByLocale = {}
for (const locale of SUPPORTED_UI_LOCALES) {
  assert.deepEqual(
    awardsKeysByLocale[locale],
    expectedAwardsKeys,
    `${locale}.json awards keys must match vi.json`,
  )
  const json = JSON.parse(readFileSync(join(localesDir, `${locale}.json`), 'utf8'))
  assert.equal(typeof json.meta, 'object', `${locale}.json must ship document meta`)
  metaKeysByLocale[locale] = collectKeys(json.meta).sort()
}

const expectedMetaKeys = metaKeysByLocale.vi
for (const locale of SUPPORTED_UI_LOCALES) {
  assert.deepEqual(
    metaKeysByLocale[locale],
    expectedMetaKeys,
    `${locale}.json meta keys must match vi.json`,
  )
}

console.log(`Verified ${verifiedTransitions} locale-preserving app transitions.`)
