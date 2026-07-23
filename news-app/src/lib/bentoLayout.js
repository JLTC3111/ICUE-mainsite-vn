/**
 * Magic UI–style bento spans for a 3-column grid.
 * Prefer equal row heights + column spans only (like the official demo):
 *   [1][2----]
 *   [2----][1]
 * Carousel slides of 4 still sum to 6 cell-units (fills a 3×2 board).
 */
const BENTO_TEMPLATES = {
  1: [
    [{ cols: 2, rows: 1 }],
    [{ cols: 1, rows: 1 }],
  ],
  2: [
    [
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
    ],
    [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
    ],
  ],
  3: [
    [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 2, rows: 1 },
    ],
    [
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
    ],
  ],
  4: [
    // Official Magic UI demo mosaic
    [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
    ],
    // Mirror
    [
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
    ],
    // Wide pair on top, wide pair mirrored
    [
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
    ],
    // Compact pair on top
    [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
    ],
  ],
  5: [
    [
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
    ],
    [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
    ],
  ],
  6: [
    Array.from({ length: 6 }, () => ({ cols: 1, rows: 1 })),
    [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 2, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 1 },
      { cols: 2, rows: 1 },
    ],
  ],
}

/** Repeating column-span mosaic for longer non-carousel grids. */
const MOSAIC_CYCLE = [
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 1 },
]

export function hashSeed(value, index = 0) {
  return (value || String(index)).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

/**
 * Resolve span list for `total` cards.
 * @param {number} total
 * @param {number} [templateIndex=0] — rotates curated patterns (carousel page, etc.)
 */
export function resolveBentoSpans(total, templateIndex = 0) {
  if (total <= 0) return []

  const set = BENTO_TEMPLATES[total]
  if (set) {
    const pattern = set[Math.abs(templateIndex) % set.length]
    return pattern.map((span) => ({ ...span }))
  }

  return Array.from({ length: total }, (_, index) => {
    const span = MOSAIC_CYCLE[index % MOSAIC_CYCLE.length]
    return { cols: span.cols, rows: span.rows }
  })
}

/**
 * @deprecated Prefer resolveBentoSpans — size is no longer derived from the slug hash.
 */
export function bentoLayout(slug, index, total, templateIndex = 0) {
  const spans = resolveBentoSpans(total, templateIndex)
  return spans[index] || { cols: 1, rows: 1 }
}

/**
 * Attach spanCols/spanRows using packed templates.
 *
 * @param {object[]} items
 * @param {{ templateIndex?: number }} [options]
 */
export function withBentoLayout(items, options = {}) {
  const templateIndex =
    options.templateIndex ??
    hashSeed(items[0]?.slug || items[0]?.id, items.length)

  const spans = resolveBentoSpans(items.length, templateIndex)

  return items.map((item, index) => {
    const span = spans[index] || { cols: 1, rows: 1 }
    return {
      ...item,
      spanCols: span.cols,
      spanRows: span.rows,
    }
  })
}

export function chunkBentoItems(items, pageSize) {
  const slides = []
  for (let i = 0; i < items.length; i += pageSize) {
    slides.push(items.slice(i, i + pageSize))
  }
  return slides
}
