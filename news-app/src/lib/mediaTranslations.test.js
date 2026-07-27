// Zero-dependency regression tests: `npm test` (node --test) in news-app/.
// These cover the two silent gallery failures described in mediaTranslations.js.

import test from 'node:test'
import assert from 'node:assert/strict'
import { applyMediaCaptions, findUntranslatedCaptions } from './mediaTranslations.js'

const ORIGINALS = [
  { id: 'img-1', kind: 'image', info: 'Ảnh Tạo Bởi A.I' },
  { id: 'vid-1', kind: 'video', info: 'Source: Joby Aviation website' },
  { id: 'img-2', kind: 'image', info: '' },
]

test('an empty translated media array never empties the gallery', () => {
  // The original bug: `translated?.filter(...) || originals` returned [] because
  // an empty array is truthy, so the whole gallery disappeared on language switch.
  assert.deepEqual(applyMediaCaptions(ORIGINALS, []), ORIGINALS)
  assert.deepEqual(applyMediaCaptions(ORIGINALS, null), ORIGINALS)
  assert.equal(applyMediaCaptions(ORIGINALS, []).length, 3)
})

test('blank translated captions fall back to the authored caption', () => {
  const translated = [
    { id: 'img-1', info: '' },
    { id: 'vid-1', info: '   ' },
  ]
  const out = applyMediaCaptions(ORIGINALS, translated)
  assert.equal(out[0].info, 'Ảnh Tạo Bởi A.I')
  assert.equal(out[1].info, 'Source: Joby Aviation website')
})

test('translated captions replace the originals for images and videos alike', () => {
  const translated = [
    { id: 'img-1', info: 'AIによって生成された画像' },
    { id: 'vid-1', info: '出典：Joby Aviationのウェブサイト' },
  ]
  const out = applyMediaCaptions(ORIGINALS, translated)
  assert.equal(out[0].info, 'AIによって生成された画像')
  assert.equal(out[1].info, '出典：Joby Aviationのウェブサイト')
  // Untouched item keeps its (empty) caption and still exists.
  assert.equal(out[2].id, 'img-2')
  assert.equal(out.length, 3)
})

test('media list length and order always come from the originals', () => {
  const translated = [{ id: 'ghost', info: 'not in the article' }]
  const out = applyMediaCaptions(ORIGINALS, translated)
  assert.deepEqual(out.map((m) => m.id), ['img-1', 'vid-1', 'img-2'])
})

test('findUntranslatedCaptions reports only captioned items lacking a translation', () => {
  const translated = [{ id: 'img-1', info: 'AIによって生成された画像' }]
  const missing = findUntranslatedCaptions(ORIGINALS, translated)
  // img-2 has no authored caption, so it is not reported.
  assert.deepEqual(missing.map((m) => m.id), ['vid-1'])
  assert.deepEqual(findUntranslatedCaptions(ORIGINALS, []).map((m) => m.id), ['img-1', 'vid-1'])
})
