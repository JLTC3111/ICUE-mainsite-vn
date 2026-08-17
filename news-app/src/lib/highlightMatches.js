/**
 * Splits display text into plain and matched runs for the live newsroom search.
 *
 * The match rule is deliberately the same one `searchArticles` filters with —
 * whitespace-separated terms, case-insensitive substring, no diacritic folding.
 * If the two ever drift, a card can survive the filter with nothing marked on
 * it, which reads as a bug in the search rather than in the highlighter.
 */

/** `q` → the distinct lowercase terms, longest first so `mark` wins over `ma`. */
export function searchTerms(query) {
  const terms = [...new Set((query || '').trim().toLowerCase().split(/\s+/).filter(Boolean))]
  return terms.sort((a, b) => b.length - a.length)
}

/**
 * @param {string} text display copy, already translated/normalized
 * @param {string} query the raw `?q=` value
 * @returns {{ text: string, match: boolean }[]} runs in source order; a single
 *   non-matching run when there is nothing to mark, so callers can cheaply test
 *   for "no highlight" and render the string as-is.
 */
export function highlightSegments(text, query) {
  const source = typeof text === 'string' ? text : ''
  const terms = searchTerms(query)
  if (!source || !terms.length) return [{ text: source, match: false }]

  const haystack = source.toLowerCase()
  // Lowercasing is length-preserving for every script this site publishes in,
  // but not universally (`İ` expands to two code units). Offsets taken from the
  // haystack would then slice the source in the wrong places, so bail out and
  // leave the text unmarked rather than corrupt it.
  if (haystack.length !== source.length) return [{ text: source, match: false }]

  const ranges = []
  for (const term of terms) {
    for (let from = 0; from <= haystack.length - term.length;) {
      const at = haystack.indexOf(term, from)
      if (at === -1) break
      ranges.push([at, at + term.length])
      from = at + term.length
    }
  }
  if (!ranges.length) return [{ text: source, match: false }]

  // Terms are matched independently, so two of them can overlap ("nhà" and
  // "nhân" in "nhân"). Merge into disjoint runs before slicing.
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged = [ranges[0]]
  for (const [start, end] of ranges.slice(1)) {
    const last = merged[merged.length - 1]
    if (start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }

  const segments = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: source.slice(cursor, start), match: false })
    segments.push({ text: source.slice(start, end), match: true })
    cursor = end
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), match: false })
  return segments
}

/** True when `text` has at least one run worth marking. */
export function hasHighlight(text, query) {
  return highlightSegments(text, query).some((segment) => segment.match)
}
