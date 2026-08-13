import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getArticleTranslationCompleteness,
  getLocaleTranslationCompleteness,
} from './translationCompleteness.js'

const ARTICLE = {
  title: 'Tiêu đề',
  subtitle: 'Tiêu đề phụ',
  content_html: '<p>Nội dung</p>',
  cover_info: 'Nguồn ảnh',
  language: 'vi',
  media: [
    { id: 'img-1', kind: 'image', info: 'Chú thích ảnh' },
    { id: 'vid-1', kind: 'video', info: 'Chú thích video' },
    { id: 'img-2', kind: 'image', info: '' },
  ],
  sources: [
    { id: 'src-1', label: 'Tài liệu', publisher: 'Nhà xuất bản', url: 'https://example.com' },
  ],
}

const COMPLETE = {
  title: 'Title',
  subtitle: 'Subtitle',
  content_html: '<p>Story</p>',
  cover_info: 'Image source',
  media: [
    { id: 'img-1', info: 'Image caption' },
    { id: 'vid-1', info: 'Video caption' },
  ],
  sources: [
    { id: 'src-1', label: 'Reference', publisher: 'Publisher' },
  ],
}

test('requires every authored article element in a locale translation', () => {
  const result = getLocaleTranslationCompleteness(ARTICLE, {
    ...COMPLETE,
    subtitle: '',
    media: [{ id: 'img-1', info: 'Image caption' }],
    sources: [{ id: 'src-1', label: 'Reference', publisher: '' }],
  })

  assert.equal(result.complete, false)
  assert.deepEqual(result.missing.map((item) => item.kind), [
    'subtitle',
    'media_caption',
    'source_publisher',
  ])
})

test('does not require optional elements absent from the source article', () => {
  const article = { ...ARTICLE, subtitle: '', cover_info: '', media: [], sources: [] }
  const result = getLocaleTranslationCompleteness(article, {
    title: 'Title',
    content_html: '<p>Story</p>',
  })

  assert.equal(result.complete, true)
})

test('uses original English bibliography text for the English locale', () => {
  const english = getLocaleTranslationCompleteness(ARTICLE, {
    ...COMPLETE,
    sources: [],
  }, 'en')

  assert.equal(english.complete, true)
  assert.deepEqual(english.missing, [])

  const german = getLocaleTranslationCompleteness(ARTICLE, {
    ...COMPLETE,
    sources: [],
  }, 'de')

  assert.deepEqual(german.missing.map((item) => item.kind), [
    'source_label',
    'source_publisher',
  ])
})

test('respects an explicit non-English source language', () => {
  const article = {
    ...ARTICLE,
    sources: ARTICLE.sources.map((source) => ({ ...source, language: 'vi' })),
  }
  const result = getLocaleTranslationCompleteness(article, {
    ...COMPLETE,
    sources: [],
  }, 'en')

  assert.deepEqual(result.missing.map((item) => item.kind), [
    'source_label',
    'source_publisher',
  ])
})

test('counts English as complete without duplicate source rows', () => {
  const languages = ['vi', 'en', 'de']
  const result = getArticleTranslationCompleteness(ARTICLE, {
    vi: { sources: COMPLETE.sources },
    en: { ...COMPLETE, sources: [] },
    de: COMPLETE,
  }, languages)

  assert.equal(result.complete, true)
  assert.equal(result.completedLocales, 3)
  assert.equal(result.totalLocales, 3)
  assert.deepEqual(result.incompleteLocales, [])
})

test('adds the article locale as a source-only translation when bibliography language differs', () => {
  const sourceOnly = getLocaleTranslationCompleteness(ARTICLE, {
    sources: COMPLETE.sources,
  }, 'vi')

  assert.equal(sourceOnly.complete, true)
  assert.deepEqual(sourceOnly.missing, [])

  const missing = getLocaleTranslationCompleteness(ARTICLE, null, 'vi')
  assert.deepEqual(missing.missing.map((item) => item.kind), [
    'source_label',
    'source_publisher',
  ])
})

test('marks an article complete only when every target locale is complete', () => {
  const languages = ['vi', 'en', 'de']
  const result = getArticleTranslationCompleteness(ARTICLE, {
    vi: { sources: COMPLETE.sources },
    en: COMPLETE,
    de: { ...COMPLETE, subtitle: '' },
  }, languages)

  assert.equal(result.sourceLanguage, 'vi')
  assert.equal(result.completedLocales, 2)
  assert.equal(result.totalLocales, 3)
  assert.deepEqual(result.incompleteLocales, ['de'])
  assert.equal(result.complete, false)
})

test('reports 1/6 when every article translation is missing only the required cover caption', () => {
  const languages = ['vi', 'en', 'de', 'fr', 'ko', 'ja']
  const withoutCoverCaption = { ...COMPLETE, cover_info: '' }
  const translations = {
    vi: { sources: COMPLETE.sources },
    ...Object.fromEntries(
      languages.slice(1).map((locale) => [locale, withoutCoverCaption]),
    ),
  }

  const incomplete = getArticleTranslationCompleteness(ARTICLE, translations, languages)

  assert.equal(incomplete.completedLocales, 1)
  assert.equal(incomplete.totalLocales, 6)
  assert.deepEqual(incomplete.incompleteLocales, ['en', 'de', 'fr', 'ko', 'ja'])
  for (const locale of incomplete.incompleteLocales) {
    assert.deepEqual(incomplete.locales[locale].missing, [{ kind: 'cover_info' }])
  }

  const complete = getArticleTranslationCompleteness(ARTICLE, {
    vi: { sources: COMPLETE.sources },
    ...Object.fromEntries(languages.slice(1).map((locale) => [locale, COMPLETE])),
  }, languages)
  assert.equal(complete.completedLocales, 6)
  assert.equal(complete.complete, true)
})
