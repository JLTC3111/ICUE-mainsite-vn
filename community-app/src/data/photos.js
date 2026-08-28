/**
 * The photographs, with the intrinsic size of the largest rendition.
 *
 * Width and height are carried so every figure reserves its space before the
 * image arrives — the legacy collage had neither, and reflowed as each of its
 * thirteen JPEGs landed.
 *
 * Three renditions exist per photograph — 400px, 800px and 1600px wide — and
 * `sizes` on each <img> tells the browser which to fetch. The 400px step
 * matters: the grid renders a figure at roughly 370px on a desktop, so without
 * it a 1x screen downloads an 800px file for every one of them. Renditions that
 * are never chosen are never downloaded, so carrying all three costs nothing at
 * runtime.
 */
const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/media`

export const PHOTOS = {
  'fieldwork-survey': { width: 1280, height: 960 },
  'fieldwork-town': { width: 1280, height: 960 },
  'warm-clothes-banner': { width: 1276, height: 718 },
  'warm-clothes-coats': { width: 1269, height: 805 },
  'warm-clothes-group': { width: 1276, height: 718 },
  'warm-clothes-handover': { width: 1280, height: 960 },
  'warm-clothes-table': { width: 1276, height: 718 },
  'warm-clothes-welcome': { width: 1276, height: 718 },
  'yagi-banner': { width: 1600, height: 901 },
  'yagi-departure': { width: 1600, height: 2133 },
  'yagi-group': { width: 960, height: 1280 },
  'yagi-handover': { width: 1600, height: 2133 },
  'yagi-rice': { width: 1280, height: 720 },
}

/** `srcSet` for one photograph, both widths. */
export function srcSet(id) {
  return `${BASE}/${id}-400.webp 400w, ${BASE}/${id}-800.webp 800w, ${BASE}/${id}-1600.webp 1600w`
}

/** Fallback `src` for browsers that ignore srcSet. */
export function src(id) {
  return `${BASE}/${id}-400.webp`
}

export function dimensions(id) {
  return PHOTOS[id] || { width: 1600, height: 1067 }
}
