import { normalizeDeep } from '@icue/text/normalizeUnicode'
import vi from '../locales/vi.json'

/**
 * The About page's structure — the parts that are the same in every language.
 *
 * Copy is not here any more. It lives in the locale files under `about`, and
 * the page reads it through i18next like the rest of the app. What stays is
 * everything a translation cannot change: which image goes in which slot, and
 * which colour class each letter of the wordmark takes.
 */

/**
 * The six statements the text slider types out, in order — one per progress dot.
 * Each carries inline <strong class="highlight-text-phrase"> markup: the slider
 * types node by node, so the emphasis has to survive as HTML rather than plain
 * text.
 *
 * Re-exported from vi.json rather than written out again. The JSX slider reads
 * the reader's own language from i18next; this export is the Vietnamese copy for
 * the legacy embed driver (legacy/aboutUsPage.js), which has no i18next of its
 * own and still serves /about-us-legacy. Sourcing both from the same file is
 * what keeps the two renderings from drifting apart.
 *
 * `normalizeDeep` matches what i18n.js does to the same strings on the way in,
 * so the legacy page and the JSX page render identical glyphs.
 */
export const ABOUT_US_SLIDES = normalizeDeep(vi.about.slides)

/**
 * Photographs for the highlights gallery, oldest first.
 *
 * `image` is WebP (primary); `fallback` is a resized JPEG for browsers without
 * WebP. Dimensions are intrinsic — they reserve space before decode. Only the
 * file paths live here; captions are per-language in `about.gallery.<key>`.
 */
export const ABOUT_US_GALLERY = [
  {
    key: 'publicSpaces2018',
    image: '/aboutUs/UN-Habitat-HealthBridge.webp',
    fallback: '/aboutUs/UN-Habitat-HealthBridge.jpg',
    width: 960,
    height: 638,
  },
  {
    key: 'laoCai',
    image: '/aboutUs/laocai.webp',
    fallback: '/aboutUs/laocai.jpg',
    width: 960,
    height: 720,
  },
  {
    key: 'workshop2025',
    image: '/aboutUs/hoithaokhoahoc.webp',
    fallback: '/aboutUs/hoithaokhoahoc.jpg',
    width: 960,
    height: 720,
  },
  {
    key: 'urbanSummit2025',
    image: '/aboutUs/conference_nov5_2025.webp',
    fallback: '/aboutUs/conference_nov5_2025.jpg',
    width: 960,
    height: 720,
  },
  {
    key: 'dubai2025',
    image: '/aboutUs/dubai_2025_1.webp',
    fallback: '/aboutUs/dubai_2025_1.jpg',
    width: 960,
    height: 720,
  },
  {
    key: 'dubai2025Stage',
    image: '/aboutUs/dubai_2025_2.webp',
    fallback: '/aboutUs/dubai_2025_2.jpg',
    width: 960,
    height: 720,
  },
  {
    key: 'dubai2025Plenary',
    image: '/aboutUs/dubai_2025_3.webp',
    fallback: '/aboutUs/dubai_2025_3.jpg',
    width: 960,
    height: 720,
  },
  {
    key: 'dubai2025Group',
    image: '/aboutUs/dubai_2025_4.webp',
    fallback: '/aboutUs/dubai_2025_4.jpg',
    width: 960,
    height: 540,
  },
  {
    key: 'dubai2025Venue',
    image: '/aboutUs/dubai_2025_5.webp',
    fallback: '/aboutUs/dubai_2025_5.jpg',
    width: 720,
    height: 960,
  },
]

/**
 * Which colour class each letter of the two-part wordmark takes.
 *
 * The legacy page hardcoded one <span> per letter of "ĐỔI MỚI" / "SÁNG TẠO",
 * and the sequence is not a simple cycle — the second part opens on c8. Keeping
 * it as data reproduces the Vietnamese rendering exactly and still colours a
 * translation of any other length, by wrapping round.
 */
export const WORDMARK_COLOR_SEQUENCES = {
  first: ['c1', 'c2', 'c1', 'c4', 'c5', 'c6', 'c7'],
  second: ['c8', 'c1', 'c2', 'c1', 'c4', 'c5', 'c6', 'c7'],
}

/** The two image grids, in render order. Sizes are the intrinsic dimensions. */
export const ABOUT_US_PEOPLE_IMAGES = [
  { key: 'planning', src: '/aboutUs/kids2.webp', width: 600, height: 450, grid: 'top' },
  { key: 'collaboration', src: '/aboutUs/hat.webp', width: 600, height: 600, grid: 'top' },
  { key: 'construction', src: '/aboutUs/kids1.webp', width: 600, height: 303, grid: 'mid' },
]

export const ABOUT_US_MEMBER_IMAGES = [
  { key: 'vision', src: '/aboutUs/aboutUs1.webp', width: 600, height: 385 },
  { key: 'mission', src: '/aboutUs/aboutUs2.webp', width: 600, height: 384 },
  { key: 'values', src: '/aboutUs/aboutUs3.webp', width: 600, height: 496 },
  { key: 'team', src: '/aboutUs/aboutUs4.webp', width: 600, height: 290 },
]
