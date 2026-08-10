import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveArticlePreviewText } from './translateUtils.js'

const ARTICLE = {
  title: 'Tiêu đề gốc',
  subtitle: 'Phụ đề gốc',
  content_html: '<p>Nội dung gốc</p>',
}

test('featured preview uses every available selected-locale field', () => {
  const result = resolveArticlePreviewText(ARTICLE, {
    title: 'Translated title',
    subtitle: 'Translated subtitle',
    content_html: '<p>Translated report body</p>',
  })

  assert.deepEqual(result, {
    title: 'Translated title',
    subtitle: 'Translated subtitle',
    contentHtml: '<p>Translated report body</p>',
  })
})

test('featured preview does not leak source copy while translation is pending', () => {
  assert.deepEqual(resolveArticlePreviewText(ARTICLE, null, true), {
    title: '',
    subtitle: '',
    contentHtml: '',
  })
})

test('empty translated subtitle stays empty instead of falling back to source', () => {
  const result = resolveArticlePreviewText(ARTICLE, {
    title: 'Translated title',
    subtitle: '',
    content_html: '<p>Translated body</p>',
  })

  assert.equal(result.subtitle, '')
})

