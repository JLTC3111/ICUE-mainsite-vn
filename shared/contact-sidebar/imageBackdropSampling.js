// Imported only by lazy gallery pages. Do not re-export this photo readback
// through the CSS sampler or contact-sidebar entry used by Home.
import { mapCoverPointToSource, readBackgroundAtPoint, withSidebarHidden } from './backgroundSampling.js'

const BACKDROP_PATCH = 24
let sampleCanvas = null

function getSampleContext() {
  if (typeof document === 'undefined') return null
  if (!sampleCanvas) sampleCanvas = document.createElement('canvas')
  return sampleCanvas.getContext('2d', { willReadFrequently: true })
}

function averageImageData(data) {
  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 12) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count += 1
  }

  return count ? [r / count, g / count, b / count] : null
}

function resolveImageFromHit(target, x, y) {
  let img = null
  if (target instanceof HTMLImageElement) img = target
  else if (target instanceof Element) {
    const nested = target.querySelector('img')
    if (nested instanceof HTMLImageElement) img = nested
    else {
      const slide = target.closest('.swiper-slide')?.querySelector('img')
      if (slide instanceof HTMLImageElement) img = slide
    }
  }
  if (!img) return null
  const rect = img.getBoundingClientRect()
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null
  return img
}

function mapContainPointToSource(el, x, y, intrinsicW, intrinsicH) {
  const rect = el.getBoundingClientRect()
  const vw = intrinsicW
  const vh = intrinsicH
  if (!vw || !vh || rect.width <= 0 || rect.height <= 0) return null

  const scale = Math.min(rect.width / vw, rect.height / vh)
  const dispW = vw * scale
  const dispH = vh * scale
  const offsetX = (rect.width - dispW) / 2
  const offsetY = (rect.height - dispH) / 2
  const nx = (x - rect.left - offsetX) / dispW
  const ny = (y - rect.top - offsetY) / dispH
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null
  return { px: nx * vw, py: ny * vh }
}

function sampleImagePatch(img, x, y, size = BACKDROP_PATCH) {
  if (!(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth < 2) return null

  const mapped = getComputedStyle(img).objectFit === 'contain'
    ? mapContainPointToSource(img, x, y, img.naturalWidth, img.naturalHeight)
    : mapCoverPointToSource(img, x, y, img.naturalWidth, img.naturalHeight)
  if (!mapped) return null

  const ctx = getSampleContext()
  if (!ctx || !sampleCanvas) return null
  sampleCanvas.width = size
  sampleCanvas.height = size

  try {
    ctx.drawImage(img, mapped.px - size / 2, mapped.py - size / 2, size, size, 0, 0, size, size)
    return averageImageData(ctx.getImageData(0, 0, size, size).data)
  } catch {
    return null
  }
}

/** Same-origin photo contrast for gallery arrows, with CSS fallback. */
export function readElementBackdropRgb(el) {
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2

  return withSidebarHidden(el, () => {
    const target = document.elementFromPoint(x, y)
    const img = resolveImageFromHit(target, x, y)
    if (img) {
      const patch = sampleImagePatch(img, x, y)
      if (patch) return patch
    }
    return readBackgroundAtPoint(target) ?? readBackgroundAtPoint(document.body)
  })
}
