import { useCallback, useEffect, useState } from 'react'

const COLOR_PROBE = typeof document !== 'undefined' ? document.createElement('span') : null
const OPAQUE_ALPHA = 0.72

function parseColor(color) {
  if (!color || color === 'transparent') return null

  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
  if (rgba) {
    const alpha = rgba[4] !== undefined ? Number(rgba[4]) : 1
    if (alpha <= 0.04 || alpha < OPAQUE_ALPHA) return null
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])]
  }

  if (!COLOR_PROBE) return null
  COLOR_PROBE.style.color = ''
  COLOR_PROBE.style.color = color
  const resolved = getComputedStyle(COLOR_PROBE).color
  return parseColor(resolved)
}

function luminance([r, g, b]) {
  const channel = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function averageRgb(samples) {
  if (!samples.length) return null
  const total = samples.reduce(
    (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
    [0, 0, 0],
  )
  return total.map((value) => value / samples.length)
}

function parseGradientColors(backgroundImage) {
  if (!backgroundImage || backgroundImage === 'none') return null
  const matches = backgroundImage.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi)
  if (!matches?.length) return null
  const colors = matches.map(parseColor).filter(Boolean)
  return averageRgb(colors)
}

function readPseudoBackground(el, pseudo) {
  if (!(el instanceof Element)) return null
  const style = getComputedStyle(el, pseudo)
  const solid = parseColor(style.backgroundColor)
  if (solid) return solid
  return parseGradientColors(style.backgroundImage)
}

function readHomeHeroBackground(target) {
  const hero = target?.closest?.('.home-hero')
  if (!hero) return null

  if (getBackgroundVideos().some(isMediaVisible)) return null

  const media = hero.querySelector('.home-hero__media')
  if (!media) return null

  const warp = media.querySelector('.home-hero__warp')
  if (warp) {
    const warpBg = readBackground(warp)
    if (warpBg) return warpBg
  }

  const beforeBg = readPseudoBackground(media, '::before')
  if (beforeBg) return beforeBg

  return null
}

function readBackground(el) {
  let node = el
  while (node && node !== document.documentElement) {
    if (node.classList?.contains('contact-sidebar')) {
      node = node.parentElement
      continue
    }

    const style = getComputedStyle(node)
    const solid = parseColor(style.backgroundColor)
    if (solid) return solid

    const gradient = parseGradientColors(style.backgroundImage)
    if (gradient) return gradient

    const beforeBg = readPseudoBackground(node, '::before')
    if (beforeBg) return beforeBg

    const afterBg = readPseudoBackground(node, '::after')
    if (afterBg) return afterBg

    node = node.parentElement
  }

  return parseColor(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255]
}

let sampleCanvas = null

function getSampleContext() {
  if (typeof document === 'undefined') return null
  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = 6
    sampleCanvas.height = 6
  }
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

function mapCoverPointToSource(video, x, y) {
  const rect = video.getBoundingClientRect()
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null

  const fullViewport = coversViewport(rect)
  const boxWidth = fullViewport ? window.innerWidth : rect.width
  const boxHeight = fullViewport ? window.innerHeight : rect.height
  const boxLeft = fullViewport ? 0 : rect.left
  const boxTop = fullViewport ? 0 : rect.top

  if (boxWidth <= 0 || boxHeight <= 0) return null

  const nx = (x - boxLeft) / boxWidth
  const ny = (y - boxTop) / boxHeight
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null

  const elementAR = boxWidth / boxHeight
  const videoAR = vw / vh
  let sx
  let sy
  let sw
  let sh

  if (videoAR > elementAR) {
    sh = vh
    sw = vh * elementAR
    sx = (vw - sw) / 2
    sy = 0
  } else {
    sw = vw
    sh = vw / elementAR
    sx = 0
    sy = (vh - sh) / 2
  }

  return {
    px: sx + nx * sw,
    py: sy + ny * sh,
  }
}

function sampleBitmapAt(bitmap, rect, x, y) {
  const ctx = getSampleContext()
  if (!ctx || !bitmap || rect.width <= 0 || rect.height <= 0) return null

  try {
    let px
    let py

    if (bitmap instanceof HTMLVideoElement) {
      if (bitmap.readyState < 2) return null
      const mapped = mapCoverPointToSource(bitmap, x, y)
      if (!mapped) return null
      px = mapped.px
      py = mapped.py
    } else {
      px = ((x - rect.left) / rect.width) * (bitmap.width || rect.width)
      py = ((y - rect.top) / rect.height) * (bitmap.height || rect.height)
    }

    ctx.clearRect(0, 0, 6, 6)
    ctx.drawImage(bitmap, px - 3, py - 3, 6, 6, 0, 0, 6, 6)
    return averageImageData(ctx.getImageData(0, 0, 6, 6).data)
  } catch {
    return null
  }
}

function isMediaVisible(el) {
  if (!(el instanceof Element)) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

function getBackgroundVideos() {
  const seen = new Set()
  const videos = []

  document.querySelectorAll('video.video-bg, video#bgVideo').forEach((node) => {
    if (!(node instanceof HTMLVideoElement) || seen.has(node)) return
    seen.add(node)
    videos.push(node)
  })

  return videos
}

function coversViewport(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return rect.width >= vw * 0.75 && rect.height >= vh * 0.75
}

function sampleRenderedMediaAt(x, y) {
  const samples = []

  getBackgroundVideos().forEach((video) => {
    if (!isMediaVisible(video)) return
    const rect = video.getBoundingClientRect()
    const inBounds =
      coversViewport(rect) ||
      (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
    if (!inBounds) return
    const sample = sampleBitmapAt(video, rect, x, y)
    if (sample) samples.push(sample)
  })

  return averageRgb(samples)
}

function readVisibleBackground(x, y, target) {
  const media = sampleRenderedMediaAt(x, y)
  if (media) return media
  return target ? readBackground(target) : null
}

function sampleBackgroundAt(x, y, excludeRoot) {
  const media = sampleRenderedMediaAt(x, y)
  if (media) return media
  const target = sampleTargetAt(x, y, excludeRoot)
  if (!target) return null

  const heroBg = readHomeHeroBackground(target)
  if (heroBg) return heroBg

  return readBackground(target)
}

function pickIconColor(bgRgb) {
  const lum = luminance(bgRgb)
  if (lum < 0.42) return '#ffffff'
  if (lum > 0.82) return '#000000'
  return lum < 0.58 ? '#ffffff' : '#000000'
}

function withSidebarHidden(excludeRoot, fn) {
  const sidebar = document.querySelector('.contact-sidebar')
  const prevSidebarPointer = sidebar?.style.pointerEvents
  const prevSidebarVisibility = sidebar?.style.visibility
  const prevSelf = excludeRoot?.style.pointerEvents

  if (sidebar) {
    sidebar.style.pointerEvents = 'none'
    sidebar.style.visibility = 'hidden'
  }
  if (excludeRoot) excludeRoot.style.pointerEvents = 'none'

  try {
    return fn()
  } finally {
    if (sidebar) {
      sidebar.style.pointerEvents = prevSidebarPointer || ''
      sidebar.style.visibility = prevSidebarVisibility || ''
    }
    if (excludeRoot) excludeRoot.style.pointerEvents = prevSelf || ''
  }
}

function sampleTargetAt(x, y, excludeRoot) {
  return withSidebarHidden(excludeRoot, () => document.elementFromPoint(x, y))
}

function samplePointsFor(rect, viewWidth) {
  const inset = viewWidth < 768 ? 40 : 24
  const cx = rect.left + rect.width * 0.5
  const cy = rect.top + rect.height * 0.5

  return [
    [cx, cy],
    [rect.left - inset, cy],
    [rect.left - Math.round(inset * 0.5), rect.top + rect.height * 0.35],
    [rect.left - Math.round(inset * 0.5), rect.top + rect.height * 0.65],
  ]
}

function bindVideoSampling(onFrame) {
  const bound = new WeakSet()

  const bindOne = (video) => {
    if (!(video instanceof HTMLVideoElement) || bound.has(video)) return
    bound.add(video)
    video.addEventListener('loadeddata', onFrame)
    video.addEventListener('loadedmetadata', onFrame)
    video.addEventListener('play', onFrame)
    video.addEventListener('seeked', onFrame)
    video.addEventListener('timeupdate', onFrame)

    if (typeof video.requestVideoFrameCallback === 'function') {
      const loop = () => {
        onFrame()
        if (!video.isConnected) return
        video.requestVideoFrameCallback(loop)
      }
      video.requestVideoFrameCallback(loop)
    }
  }

  getBackgroundVideos().forEach(bindOne)

  const observer = new MutationObserver(() => {
    getBackgroundVideos().forEach(bindOne)
    onFrame()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    getBackgroundVideos().forEach((video) => {
      video.removeEventListener('loadeddata', onFrame)
      video.removeEventListener('loadedmetadata', onFrame)
      video.removeEventListener('play', onFrame)
      video.removeEventListener('seeked', onFrame)
      video.removeEventListener('timeupdate', onFrame)
    })
  }
}

export function useAdaptiveIconColor(ref, enabled = true, contentKey = '') {
  const [color, setColor] = useState('#ffffff')

  const sample = useCallback(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const viewport = window.visualViewport
    const viewWidth = viewport?.width ?? window.innerWidth
    const viewHeight = viewport?.height ?? window.innerHeight
    const offsetX = viewport?.offsetLeft ?? 0
    const offsetY = viewport?.offsetTop ?? 0

    const samples = samplePointsFor(rect, viewWidth)
      .map(([x, y]) => {
        const vx = x - offsetX
        const vy = y - offsetY
        if (vx < 0 || vy < 0 || vx > viewWidth || vy > viewHeight) return null
        return sampleBackgroundAt(x, y, el)
      })
      .filter(Boolean)

    if (!samples.length) return
    setColor(pickIconColor(averageRgb(samples)))
  }, [contentKey, enabled, ref])

  useEffect(() => {
    if (!enabled) return undefined

    let debounceId = null
    const scheduleSample = () => {
      if (debounceId) window.clearTimeout(debounceId)
      debounceId = window.setTimeout(sample, 48)
    }

    sample()

    window.addEventListener('scroll', sample, { passive: true, capture: true })
    window.addEventListener('resize', sample)
    window.addEventListener('icue:legacy-page-ready', scheduleSample)
    window.addEventListener('icue:aboutUsVideoEnabled', scheduleSample)
    window.addEventListener('icue:homeVideoEnabled', scheduleSample)

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', sample)
    viewport?.addEventListener('scroll', sample)

    const content = document.getElementById('content')
    const observer = content
      ? new MutationObserver(scheduleSample)
      : null
    observer?.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    const unbindVideos = bindVideoSampling(scheduleSample)
    const id = window.setInterval(sample, 500)

    return () => {
      if (debounceId) window.clearTimeout(debounceId)
      window.removeEventListener('scroll', sample, true)
      window.removeEventListener('resize', sample)
      window.removeEventListener('icue:legacy-page-ready', scheduleSample)
      window.removeEventListener('icue:aboutUsVideoEnabled', scheduleSample)
      window.removeEventListener('icue:homeVideoEnabled', scheduleSample)
      viewport?.removeEventListener('resize', sample)
      viewport?.removeEventListener('scroll', sample)
      observer?.disconnect()
      unbindVideos()
      window.clearInterval(id)
    }
  }, [contentKey, enabled, sample])

  return color
}
