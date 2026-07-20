/** Default category tab when opening the newsroom (Urban Development). */
export { NEWSROOM_DEFAULT_CATEGORY } from './categories'

/** Articles shown before "Load more" — keeps bento/coverflow fast as the archive grows. */
export const NEWSROOM_INITIAL_VISIBLE = 18

/** How many additional articles each "Load more" reveals. */
export const NEWSROOM_LOAD_MORE_STEP = 12

/** Mobile + tablet breakpoint — horizontal parallax carousel below this width; bento grid above. */
export const NEWSROOM_COMPACT_QUERY = '(max-width: 1024px)'

/** Desktop bento vertical carousel — first page size and min-width gate. */
export const NEWSROOM_BENTO_CAROUSEL_QUERY = '(min-width: 1025px)'
export const NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE = 4
