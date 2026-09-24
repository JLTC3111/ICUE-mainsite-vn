import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { sanitizeArticleHtml } from '../../shared/text/sanitizeArticleHtml.js'
import { normalizeHtmlUnicode } from '../../shared/text/normalizeUnicode.js'
import { embedVideosInHtml } from '../../news-app/src/lib/videoEmbeds.js'

function documentForTest(t) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'dangerously' })
  for (const name of ['DOMParser', 'Node', 'NodeFilter']) {
    const previous = globalThis[name]
    globalThis[name] = dom.window[name]
    t.after(() => { if (previous === undefined) delete globalThis[name]; else globalThis[name] = previous })
  }
  t.after(() => dom.window.close())
  return dom.window
}

test('the DOM sanitizer removes executable descendants in legacy bold and italic markup', t => {
  const window = documentForTest(t)
  const payloads = [
    '<b><i><img src="invalid" onerror="document.body.dataset.executed = 1"></i></b>',
    '<i><b><a href="java&#x09;script:alert(1)" onclick="alert(1)">text</a></b></i>',
    '<b><i><iframe srcdoc="<script>alert(1)</script>"></iframe><svg onload="alert(1)"></svg></i></b>',
    '<b><i><b><img src="invalid" onerror="document.body.dataset.executed = 1"></b></i></b>',
  ]
  for (const input of payloads) {
    const clean = sanitizeArticleHtml(input)
    assert.doesNotMatch(clean, /onerror|onclick|onload|javascript|iframe|<svg|<script/i)
    assert.equal(sanitizeArticleHtml(clean), clean)
    // Use the same pair of sanitization/normalization stages as the reader.
    const readerHtml = normalizeHtmlUnicode(embedVideosInHtml(sanitizeArticleHtml(normalizeHtmlUnicode(clean))))
    window.document.body.innerHTML = readerHtml
    for (const img of window.document.images) img.dispatchEvent(new window.Event('error'))
    assert.equal(window.document.body.dataset.executed, undefined)
  }
})

test('normalizing legacy tags preserves safe text, formatting, and links', t => {
  documentForTest(t)
  const clean = sanitizeArticleHtml('<b style="color: #2563eb"><i>Tiếng Việt 한국어</i> <a href="https://icue.vn" target="_blank">ICUE</a></b>')
  assert.equal(clean, '<strong style="color: #2563eb"><em>Tiếng Việt 한국어</em> <a href="https://icue.vn" target="_blank" rel="noopener noreferrer">ICUE</a></strong>')
})

test('video links within prose retain all text and remain valid inline links', t => {
  const window = documentForTest(t)
  for (const href of ['https://www.youtube.com/watch?v=abcdefghijk', 'https://vimeo.com/123456']) {
    const input = `<p>Before <strong><a href="${href}">our video</a></strong> and after.</p>`
    const result = embedVideosInHtml(input)
    window.document.body.innerHTML = result
    assert.equal(window.document.querySelector('p').textContent, 'Before our video and after.')
    assert.equal(window.document.querySelector('a').href, href)
    assert.equal(window.document.querySelector('figure'), null)
  }
})

test('standalone video links still become embeds without removing neighboring media', t => {
  const window = documentForTest(t)
  const link = '<a href="https://youtu.be/abcdefghijk">video</a>'
  window.document.body.innerHTML = embedVideosInHtml(`<p><strong>${link}</strong></p>`)
  assert.ok(window.document.querySelector('figure.video-embed--dialog'))
  window.document.body.innerHTML = embedVideosInHtml(`<p><img src="/photo.jpg">${link}</p>`)
  assert.equal(window.document.querySelector('img').getAttribute('src'), '/photo.jpg')
  assert.ok(window.document.querySelector('a'))
})
