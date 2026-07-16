/** Default category tab when opening the newsroom (Urban Development). */
export { NEWSROOM_DEFAULT_CATEGORY } from './categories'

/** Articles shown before "Load more" — keeps bento/coverflow fast as the archive grows. */
export const NEWSROOM_INITIAL_VISIBLE = 18

/** How many additional articles each "Load more" reveals. */
export const NEWSROOM_LOAD_MORE_STEP = 12

/** Mobile/tablet breakpoint — coverflow carousel below this width; bento grid above. */
export const NEWSROOM_COMPACT_QUERY = '(max-width: 1024px)'
