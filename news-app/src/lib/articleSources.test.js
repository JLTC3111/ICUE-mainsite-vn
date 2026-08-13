import test from 'node:test'
import assert from 'node:assert/strict'
import {
  articleSourceNeedsTranslation,
  normalizeArticleSourceLanguage,
  sanitizeSourcesForSave,
  sourcesForDisplay,
} from './articleSources.js'

test('legacy bibliography rows default to English, not the article language', () => {
  assert.equal(normalizeArticleSourceLanguage(), 'en')
  assert.equal(articleSourceNeedsTranslation({ label: 'Reference' }, 'en'), false)
  assert.equal(articleSourceNeedsTranslation({ label: 'Reference' }, 'vi'), true)
})

test('an explicitly Vietnamese source is original in Vietnamese and translated elsewhere', () => {
  const source = { language: 'vi', label: 'Tài liệu' }
  assert.equal(articleSourceNeedsTranslation(source, 'vi'), false)
  assert.equal(articleSourceNeedsTranslation(source, 'de'), true)
})

test('source language metadata survives save normalization', () => {
  const [source] = sanitizeSourcesForSave([{
    id: 'source-1',
    language: 'ja-JP',
    label: '資料',
    url: 'https://example.com',
  }])

  assert.equal(source.language, 'ja')
})

test('localized source copy replaces labels but keeps original metadata', () => {
  const [source] = sourcesForDisplay([{
    id: 'source-1',
    language: 'en',
    label: 'Reference',
    publisher: 'Publisher',
    url: 'https://example.com',
  }], [{
    id: 'source-1',
    label: 'Tài liệu',
    publisher: 'Nhà xuất bản',
    url: 'https://example.com',
  }])

  assert.equal(source.language, 'en')
  assert.equal(source.label, 'Tài liệu')
  assert.equal(source.publisher, 'Nhà xuất bản')
})
