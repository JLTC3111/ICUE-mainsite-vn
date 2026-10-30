import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, deferred, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

const article = (id, extra = {}) => ({
  id, slug: `story-${id}`, title: `Complete headline ${id}`, subtitle: `Article introduction ${id}`,
  category: 'urban', cover_image_url: `/cover-${id}.jpg`, author_name: `Author ${id}`,
  published_at: '2026-10-30T06:00:00Z', read_minutes: 7, ...extra,
})

async function fixture(t) {
  const dom = new JSDOM('<html><body><main></main></body></html>', { url: 'https://vi.icue.vn/newsroom/', pretendToBeVisual: true })
  const previous = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const root = createRoot(dom.window.document.querySelector('main'))
  const request = deferred()
  let query = '', locale = 'en', translation = null, translationPending = false
  const tCopy = key => `${locale}:${key}`
  const { default: Grid } = await sourceModule('news-app/src/pages/NewsGrid.jsx', {
    globals: { window: dom.window, document: dom.window.document },
    imports: {
      'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
      'react-i18next': { useTranslation: () => ({ t: tCopy, i18n: { resolvedLanguage: locale } }) },
      '../components/WordRotate': { default: () => null },
      '../components/magicui/AnimatedShinyText': { AnimatedShinyText: ({ children, className }) => React.createElement('span', { className }, children) },
      '../components/CategoryFilter': { default: ({ onChange }) => React.createElement('button', { 'data-category': 'projects', onClick: () => onChange('projects') }, 'Projects') },
      '../components/ArticleViewCounter': { default: () => null },
      '../components/AuthorLink': { default: ({ name, className }) => React.createElement('a', { href: `/people/${encodeURIComponent(name)}`, className }, name) },
      '../components/HighlightedText': { default: ({ text }) => text },
      '../components/TranslationSkeleton': { default: () => React.createElement('span', { 'data-translation-pending': true }) },
      '../hooks/useMediaQuery': { default: () => false },
      '../hooks/useDocumentTitle': { useDocumentTitle() {} },
      '../hooks/useMainSite': { useMainSite: () => ({ archiveLink: () => '/archive', hashLink: key => `/#${key}` }) },
      '../hooks/usePageResume': { usePageResume() {} },
      '../hooks/useArticleTitleTranslations': {
        useArticleTitleTranslations: () => ({ titles: {}, subtitles: {}, isTitlePending: () => false }),
        useArticlePreviewTranslation: () => ({ translation, pending: translationPending }),
      },
      '../context/NewsroomSearchContext': { useNewsroomSearch: () => ({ query, clearQuery: () => { query = '' } }) },
      '../context/NewsroomThemeContext': { useNewsroomTheme: () => ({ isDark: false }) },
      '../context/PerformanceProfileContext': { usePerformanceProfile: () => ({ reduceMotion: true, simplifyHero: true }) },
      '../lib/publicArticles': { fetchPublishedArticles: () => request.promise },
      '../lib/searchArticles': { searchArticles: (articles, needle) => articles.filter(row => row.title.toLowerCase().includes(needle.toLowerCase())) },
      '../../../shared/resilience/RecoveryBoundary.jsx': { RecoveryNotice: () => React.createElement('div', { role: 'alert' }, 'Retry') },
      '../../../shared/ui/LatticeLoader.jsx': { default: ({ label }) => React.createElement('span', { role: 'status' }, label) },
    },
  })
  const render = () => act(async () => root.render(React.createElement(Grid)))
  await render()
  t.after(async () => {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  return {
    document: dom.window.document,
    async ready(rows) { await act(async () => request.resolve(rows)) },
    async set(patch) {
      if ('query' in patch) query = patch.query
      if ('locale' in patch) locale = patch.locale
      if ('translation' in patch) translation = patch.translation
      if ('translationPending' in patch) translationPending = patch.translationPending
      await render()
    },
    async click(selector) { await act(async () => dom.window.document.querySelector(selector).click()) },
  }
}

test('newsroom loading becomes a complete lead story with independent author and article destinations', async t => {
  const f = await fixture(t)
  assert.equal(f.document.querySelector('[role="status"]').textContent, 'en:news.loading')
  await f.ready(Array.from({ length: 6 }, (_, id) => article(id)))
  const lead = f.document.querySelector('.news-lead')
  assert.equal(f.document.querySelector('.news-loading'), null)
  assert.equal(lead.querySelector('h2').textContent, 'Complete headline 0')
  assert.equal(lead.querySelector('.news-lead__featured').textContent, 'en:newsroom.latest')
  assert.equal(lead.querySelector('.news-tag').textContent, 'en:categories.urban')
  assert.equal(lead.querySelector('.news-lead__media img').getAttribute('src'), '/cover-0.jpg')
  assert.equal(lead.querySelector('.news-lead__media img').getAttribute('fetchpriority'), 'high')
  assert.equal(lead.querySelector('.news-meta time').dateTime, '2026-10-30T06:00:00Z')
  assert.match(lead.querySelector('.news-meta').textContent, /Author 0.*7 en:news.minRead/)
  assert.equal(lead.querySelector('.news-meta a').getAttribute('href'), '/people/Author%200')
  assert.equal(lead.querySelector('a a'), null, 'the author destination must not be nested in an article link')
  for (const selector of ['.news-lead__media-link', '.news-lead__headline-link', '.news-lead__action']) {
    assert.equal(lead.querySelector(selector).getAttribute('href'), '/article/story-0')
  }
  assert.equal(f.document.querySelectorAll('.news-card').length, 3)
  assert.equal(f.document.querySelectorAll('.news-row').length, 2)
})

test('lead follows category/search changes and localized preview copy without leaking a source subtitle', async t => {
  const f = await fixture(t)
  await f.ready([article(0), article(1, { category: 'projects' }), article(2, { category: 'projects' })])
  await f.click('[data-category="projects"]')
  assert.equal(f.document.querySelector('.news-lead h2').textContent, 'Complete headline 1')
  await f.set({ query: 'headline 2' })
  assert.equal(f.document.querySelector('.news-lead__action').getAttribute('href'), '/article/story-2')
  await f.set({ locale: 'fr', translation: { title: 'Le titre intégral', subtitle: '' } })
  assert.equal(f.document.querySelector('.news-lead h2').textContent, 'Le titre intégral')
  assert.equal(f.document.querySelector('.news-lead__subtitle'), null)
  assert.equal(f.document.querySelector('.news-lead__action').textContent, 'fr:news.readMore↗')
  await f.set({ translationPending: true })
  assert.equal(f.document.querySelector('.news-lead h2').textContent, 'Complete headline 2', 'known grid copy remains usable while the full preview translates')
})

test('an article without cover, date, or read time retains its full headline and working action', async t => {
  const f = await fixture(t)
  const title = 'A long headline that must remain complete when no cover image or publication metadata is available'
  await f.ready([article(0, { title, cover_image_url: '', published_at: '', read_minutes: 0 })])
  const lead = f.document.querySelector('.news-lead--no-image')
  assert.equal(lead.querySelector('h2').textContent, title)
  assert.equal(lead.querySelector('.news-lead__media-link'), null)
  assert.equal(lead.querySelector('time'), null)
  assert.equal(lead.querySelector('.news-meta').textContent, 'Author 0')
  assert.equal(lead.querySelector('.news-lead__action').getAttribute('href'), '/article/story-0')
})

test('body previews appear only on the lead and three top stories, and use localized body text', async t => {
  const f = await fixture(t)
  await f.ready(Array.from({ length: 6 }, (_, id) => article(id, {
    content_html: `<h2>Body heading</h2><p>Complete headline ${id}</p><p>Article introduction ${id}</p><p>Body preview ${id} uses <strong>article text</strong> &amp; research.</p><figure><figcaption>Image caption only</figcaption></figure><script>hiddenCode()</script>`,
  })))
  assert.equal(f.document.querySelectorAll('.news-lead__excerpt').length, 1)
  assert.equal(f.document.querySelectorAll('.news-card__excerpt').length, 3)
  assert.equal(f.document.querySelectorAll('.news-row .news-card__excerpt, .news-row .news-lead__excerpt').length, 0)
  assert.equal(f.document.querySelector('.news-lead__excerpt').textContent, 'Body preview 0 uses article text & research.')
  assert.deepEqual([...f.document.querySelectorAll('.news-card__excerpt')].map(node => node.textContent), [1, 2, 3].map(id => `Body preview ${id} uses article text & research.`))
  await f.set({ locale: 'fr', translation: { title: 'Un article', subtitle: '', content_html: '<p>Le corps du texte traduit.</p>' } })
  assert.equal(f.document.querySelector('.news-lead__excerpt').textContent, 'Le corps du texte traduit.')
  await f.set({ translationPending: true })
  assert.equal(f.document.querySelector('.news-lead__excerpt'), null, 'a pending translation does not flash the original body')
})
