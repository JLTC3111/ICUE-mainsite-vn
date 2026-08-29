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

test('removes executable elements and unwraps unknown presentation tags', () => {
  const source = '<p>Before<script>alert(1)</script><iframe srcdoc="<script>alert(2)</script>">frame</iframe><svg onload="alert(3)"><circle /></svg><custom-tag onclick="alert(4)"><strong>kept</strong></custom-tag>After</p>'

  assert.equal(
    sanitizeArticleHtmlFallback(source),
    '<p>Before<strong>kept</strong>After</p>',
  )
})

test('allows only inert attributes and explicitly safe URL schemes', () => {
  const source = '<p><a href="java&#x09;script:alert(1)" onclick="x" id="clobber" target="_blank">bad</a><a href="https://icue.vn/news" target="_blank" rel="opener nofollow">safe</a><a href="mailto:hello@icue.vn">mail</a><img src="data:image/svg+xml;base64,AAAA" onerror="x" srcset="javascript:x" alt="bad"><img src="/public/news/photo.jpg" alt="safe" loading="lazy" decoding="async"></p>'
  const sanitized = sanitizeArticleHtmlFallback(source)

  assert.equal(
    sanitized,
    '<p><a target="_blank" rel="noopener noreferrer">bad</a><a href="https://icue.vn/news" target="_blank" rel="nofollow noopener noreferrer">safe</a><a href="mailto:hello@icue.vn">mail</a><img alt="bad"><img src="/public/news/photo.jpg" alt="safe" loading="lazy" decoding="async"></p>',
  )
  assert.doesNotMatch(sanitized, /javascript:|data:image|onclick|onerror|srcset|id=/iu)
  assert.equal(sanitizeArticleHtmlFallback(sanitized), sanitized)
})

test('rejects encoded and legacy executable URL schemes', () => {
  const payloads = [
    'javascript:alert(1)',
    'java&#x09;script:alert(1)',
    'javascript&colon;alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
  ]

  for (const href of payloads) {
    assert.equal(sanitizeArticleHtmlFallback(`<a href="${href}">link</a>`), '<a>link</a>')
  }
})
