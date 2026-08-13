import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ARTICLE_MAGIC_HIGHLIGHT_COLORS,
  sanitizeArticleHtmlFallback,
} from '../../../shared/text/sanitizeArticleHtml.js'

test('uses the four-color Magic UI highlight palette', () => {
  assert.deepEqual(ARTICLE_MAGIC_HIGHLIGHT_COLORS, [
    '#bfdbfe',
    '#bbf7d0',
    '#fed7aa',
    '#fef08a',
  ])
})

test('normalizes legacy and Magic UI highlights into one stable save payload', () => {
  const source = '<p><mark>Legacy default</mark></p><p><mark data-color="#bbf7d0" style="background-color: #bbf7d0"><strong>Kết quả quan trọng</strong></mark></p><p><mark data-color="#fef08a" data-magic-highlight="true" style="background-color: #fef08a; color: inherit"><strong>중요한 조사 결과</strong></mark>를 검토했습니다.</p>'
  const sanitized = sanitizeArticleHtmlFallback(source)

  assert.match(sanitized, /<mark>Legacy default<\/mark>/u)
  assert.match(sanitized, /<mark data-color="#bbf7d0" style="background-color: #bbf7d0">/u)
  assert.match(sanitized, /<mark data-color="#fef08a" style="background-color: #fef08a">/u)
  assert.match(sanitized, /<strong>중요한 조사 결과<\/strong>/u)
  assert.doesNotMatch(sanitized, /data-magic-highlight/u)
  assert.doesNotMatch(sanitized, /color: inherit/u)
  assert.equal(sanitizeArticleHtmlFallback(sanitized), sanitized)
})
