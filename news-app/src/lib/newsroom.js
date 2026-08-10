/** Default category tab when opening the newsroom (All). */
export { NEWSROOM_DEFAULT_CATEGORY } from './categories'

/** Articles shown before "Load more" — keeps bento/coverflow fast as the archive grows. */
export const NEWSROOM_INITIAL_VISIBLE = 18

/** How many additional articles each "Load more" reveals. */
export const NEWSROOM_LOAD_MORE_STEP = 12

/** Mobile/tablet carousel — fewer cards so the gallery stays scannable. */
export const NEWSROOM_COMPACT_INITIAL_VISIBLE = 10

/** Additional carousel cards per "Load more" on mobile/tablet. */
export const NEWSROOM_COMPACT_LOAD_MORE_STEP = 6

/** Mobile + tablet breakpoint — the front page collapses to list rows below this width. */
export const NEWSROOM_COMPACT_QUERY = '(max-width: 1024px)'

/* Front page bands: one lead story, then a 3-up, then a 3-column brief strip,
   then dense rows for everything else. Ordering is editorial, not a CMS field. */
export const NEWSROOM_TOP_COUNT = 3
export const NEWSROOM_BRIEF_COUNT = 3

/**
 * View counts are off on the index. A story showing "3 lượt xem" next to a
 * provincial planning report reads as low-traffic, which works against the
 * page's job. Views still increment and still show on ArticleDetail — flip
 * this to bring them back to the cards.
 */
export const NEWSROOM_SHOW_VIEW_COUNTS = false

/** Desktop bento vertical carousel — first page size and min-width gate. */
export const NEWSROOM_BENTO_CAROUSEL_QUERY = '(min-width: 1025px)'
export const NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE = 4

/** Flat gallery backdrop — page, globe ocean, and vignette layer share these. */
export const NEWSROOM_GALLERY_BG_LIGHT = '#f6f7f5'
export const NEWSROOM_GALLERY_BG_DARK = '#0a0a0a'

export function newsroomGalleryBgToRgb(hex) {
  const value = parseInt(hex.slice(1), 16)
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}
