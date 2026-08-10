import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeArticleHtmlFallback } from '../../../shared/text/sanitizeArticleHtml.js'

test('preserves highlighted Korean rich text in a stable save payload', () => {
  const source = '<p><mark data-color="#fef08a" style="background-color: #fef08a; color: inherit"><strong>중요한 조사 결과</strong></mark>를 검토했습니다.</p>'
  const sanitized = sanitizeArticleHtmlFallback(source)

  assert.match(sanitized, /<mark data-color="#fef08a" style="background-color: #fef08a">/u)
  assert.match(sanitized, /<strong>중요한 조사 결과<\/strong>/u)
  assert.doesNotMatch(sanitized, /color: inherit/u)
  assert.equal(sanitizeArticleHtmlFallback(sanitized), sanitized)
})
