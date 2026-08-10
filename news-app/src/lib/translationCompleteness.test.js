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

test('marks an article complete only when every target locale is complete', () => {
  const languages = ['vi', 'en', 'de']
  const result = getArticleTranslationCompleteness(ARTICLE, {
    en: COMPLETE,
    de: { ...COMPLETE, subtitle: '' },
  }, languages)

  assert.equal(result.sourceLanguage, 'vi')
  assert.equal(result.completedLocales, 1)
  assert.equal(result.totalLocales, 2)
  assert.deepEqual(result.incompleteLocales, ['de'])
  assert.equal(result.complete, false)
})
