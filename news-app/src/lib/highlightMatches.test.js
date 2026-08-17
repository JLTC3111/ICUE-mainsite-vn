import test from 'node:test'
import assert from 'node:assert/strict'
import { hasHighlight, highlightSegments, searchTerms } from './highlightMatches.js'

const marked = (text, query) => highlightSegments(text, query)
  .filter((segment) => segment.match)
  .map((segment) => segment.text)

const rebuilt = (text, query) => highlightSegments(text, query)
  .map((segment) => segment.text)
  .join('')

test('an empty query leaves the text as one unmarked run', () => {
  assert.deepEqual(highlightSegments('Chuyển đổi số', '   '), [
    { text: 'Chuyển đổi số', match: false },
  ])
})

test('matching ignores case but not diacritics, same as the filter', () => {
  assert.deepEqual(marked('Chuyển đổi số ở Việt Nam', 'việt'), ['Việt'])
  assert.deepEqual(marked('Chuyển đổi số ở Việt Nam', 'viet'), [])
})

test('every term is marked, and every occurrence of each, in source casing', () => {
  assert.deepEqual(marked('Data centre and data policy', 'data policy'), [
    'Data', 'data', 'policy',
  ])
})

test('overlapping terms merge into one run', () => {
  assert.deepEqual(marked('nhân lực', 'nhân nhâ'), ['nhân'])
})

test('marked runs are interleaved with the untouched copy', () => {
  assert.deepEqual(highlightSegments('AI in Thailand', 'ai'), [
    { text: 'AI', match: true },
    { text: ' in Th', match: false },
    { text: 'ai', match: true },
    { text: 'land', match: false },
  ])
})

test('segments always reassemble into the original string', () => {
  const title = 'ICUE & 조직 — 데이터 · Việt Nam'
  for (const query of ['icue', '조직 việt', 'x', '데이터 데이터', '&']) {
    assert.equal(rebuilt(title, query), title)
  }
})

test('non-string text is tolerated', () => {
  assert.deepEqual(highlightSegments(undefined, 'ai'), [{ text: '', match: false }])
  assert.equal(hasHighlight(null, 'ai'), false)
})

test('longer terms are tried first so the wider run wins', () => {
  assert.deepEqual(searchTerms('ai  AI trí tuệ'), ['trí', 'tuệ', 'ai'])
})
