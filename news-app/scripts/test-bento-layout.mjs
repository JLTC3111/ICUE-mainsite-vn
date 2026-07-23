import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveBentoSpans,
  withBentoLayout,
  bentoLayout,
  chunkBentoItems,
} from '../src/lib/bentoLayout.js'

function cellUnits(spans) {
  return spans.reduce((sum, span) => sum + span.cols * span.rows, 0)
}

describe('bentoArticles layout', () => {
  it('packs 4-card carousel slides to exactly 6 cell units', () => {
    for (let templateIndex = 0; templateIndex < 8; templateIndex += 1) {
      const spans = resolveBentoSpans(4, templateIndex)
      assert.equal(spans.length, 4)
      assert.equal(cellUnits(spans), 6, `template ${templateIndex} should fill a 3×2 slide`)
    }
  })

  it('features a wide card in the Magic UI 4-card mosaic', () => {
    const spans = resolveBentoSpans(4, 0)
    assert.deepEqual(spans.map((s) => [s.cols, s.rows]), [
      [1, 1],
      [2, 1],
      [2, 1],
      [1, 1],
    ])
  })

  it('uses a stable 3-card featured mosaic', () => {
    const spans = resolveBentoSpans(3, 0)
    assert.equal(spans.length, 3)
    assert.ok(spans.every((span) => span.rows === 1), 'column-span only')
  })

  it('rotates templates by templateIndex', () => {
    const a = resolveBentoSpans(4, 0)
    const b = resolveBentoSpans(4, 1)
    assert.notDeepEqual(a, b)
  })

  it('withBentoLayout attaches spanCols/spanRows in list order', () => {
    const items = [
      { id: 'a', slug: 'alpha', viewCount: 1 },
      { id: 'b', slug: 'beta', viewCount: 9 },
      { id: 'c', slug: 'gamma', viewCount: 2 },
      { id: 'd', slug: 'delta', viewCount: 3 },
    ]
    const laidOut = withBentoLayout(items, { templateIndex: 0 })
    assert.equal(laidOut[0].id, 'a')
    assert.equal(laidOut[0].spanCols, 1)
    assert.equal(laidOut[0].spanRows, 1)
    assert.equal(laidOut[1].spanCols, 2)
    assert.equal(laidOut.length, 4)
  })

  it('bentoLayout remains index-stable for a given total', () => {
    const total = 4
    const first = bentoLayout('anything', 0, total, 0)
    const second = bentoLayout('different-slug', 0, total, 0)
    assert.deepEqual(first, second)
  })

  it('chunkBentoItems pages by size', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: String(i) }))
    const slides = chunkBentoItems(items, 4)
    assert.equal(slides.length, 3)
    assert.equal(slides[0].length, 4)
    assert.equal(slides[2].length, 1)
  })

  it('falls back to a mosaic cycle for large grids', () => {
    const spans = resolveBentoSpans(8, 0)
    assert.equal(spans.length, 8)
    assert.ok(spans.every((span) => span.cols >= 1 && span.rows >= 1))
  })
})
