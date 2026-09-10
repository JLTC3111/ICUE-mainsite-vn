const VARIANT_WIDTHS = [480, 960]
const LOGO_VARIANT_WIDTHS = [220, 440]

/** Intrinsic widths of listing/home covers this app generates variants for. */
const COVER_WIDTHS = {
  '/news/articles/card_4.jpg': 3504,
  '/news/articles/Card_1.webp': 720,
  '/news/articles/card_9.jpg': 1168,
  '/news/articles/Card_3.jpg': 1080,
  '/news/articles/Card_2.webp': 720,
  '/news/articles/card_8.jpg': 1269,
  '/news/articles/card_6.jpg': 1000,
  '/news/articles/card_7.jpg': 1454,
  '/news/articles/card_5.jpg': 1080,
  '/pastProjects/pp_1.webp': 720,
  '/pastProjects/pp_2.jpg': 2084,
  '/pastProjects/pp_3.webp': 720,
  '/pastProjects/pp_4.jpg': 1200,
  '/pastProjects/pp_5.jpg': 1054,
  '/pastProjects/pp_6.jpg': 460,
  '/pastProjects/pp_7.jpg': 793,
  '/pastProjects/pp_8.jpg': 1117,
  '/pastProjects/pp_9.jpg': 1200,
  '/work/ourWork_img1.webp': 1920,
  '/work/ourWork_img2.webp': 1920,
  '/work/ourWork_img3.webp': 1280,
  '/work/ourWork_img4.jpg': 892,
}

function variantBase(src) {
  return src.replace(/\.(jpe?g|png|webp)$/i, '')
}

function srcSetFrom(src, intrinsicWidth, widths) {
  if (!src) return undefined
  const width = intrinsicWidth || COVER_WIDTHS[src]
  const base = variantBase(src)
  const parts = []
  for (const variant of widths) {
    if (!width || width <= variant) continue
    parts.push(`${base}-${variant}.webp ${variant}w`)
  }
  parts.push(width ? `${src} ${width}w` : src)
  return parts.length > 1 ? parts.join(', ') : undefined
}

export function coverSrcSet(src, intrinsicWidth) {
  return srcSetFrom(src, intrinsicWidth, VARIANT_WIDTHS)
}

export function logoSrcSet(src, intrinsicWidth) {
  return srcSetFrom(src, intrinsicWidth, LOGO_VARIANT_WIDTHS)
}

export const NEWS_CARD_SIZES = '(max-width: 1024px) 92vw, 420px'
export const PAST_PROJECT_CARD_SIZES = '(max-width: 1024px) 92vw, 360px'
export const HOME_CARD_SIZES = '(max-width: 768px) 92vw, 360px'
export const PAST_PROJECT_HERO_SIZES = '100vw'
export const LOGO_SIZES = '(max-width: 550px) 130px, (max-width: 1024px) 160px, 220px'
