const OPAQUE_ALPHA = 0.72
export const BACKGROUND_SAMPLE_SIZE = 48

let sampleCanvas = null

export function getSampleContext() {
  if (typeof document === 'undefined') return null
  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas')
  }
  return sampleCanvas.getContext('2d', { willReadFrequently: true })
}

export function isMediaVisible(el) {
  if (!(el instanceof Element)) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

export function getBackgroundVideos() {
  const seen = new Set()
  const videos = []

  document.querySelectorAll('video.video-bg, video#bgVideo').forEach((node) => {
    if (!(node instanceof HTMLVideoElement) || seen.has(node)) return
    if (!isBackgroundVideoEligible(node)) return
    seen.add(node)
    videos.push(node)
  })

  return videos
}

function isBackgroundVideoEligible(video) {
  if (!(video instanceof HTMLVideoElement) || !isMediaVisible(video)) return false

  if (video.closest('.home-hero')) {
    if (document.documentElement.getAttribute('data-home-bg-video') === 'off') return false
  }

  if (video.closest('.about-container')) {
    if (document.documentElement.getAttribute('data-aboutus-bg-video') === 'off') return false
  }

  return true
}

function isHomeBackgroundVideoActive() {
  if (document.documentElement.getAttribute('data-home-bg-video') === 'off') return false

  return getBackgroundVideos().some((video) => video.closest('.home-hero'))
}

export function getBackgroundCanvases() {
  const canvases = []

  document.querySelectorAll('canvas').forEach((node) => {
    if (!(node instanceof HTMLCanvasElement)) return
    if (node.closest('.contact-sidebar')) return
    if (node.closest('.home-hero__title')) return
    // The lanyard is a foreground WebGL effect, not the page background.
    // Reading it back stalls the GPU and can return a mostly transparent frame.
    if (node.closest('.home-hero__lanyard, .lanyard-wrapper')) return

    const rect = node.getBoundingClientRect()
    if (rect.width < 80 || rect.height < 80) return
    if (!isMediaVisible(node)) return

    canvases.push(node)
  })

  return canvases.sort((a, b) => {
    const aRect = a.getBoundingClientRect()
    const bRect = b.getBoundingClientRect()
    return (bRect.width * bRect.height) - (aRect.width * aRect.height)
  })
}

export function coversViewport(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return rect.width >= vw * 0.75 && rect.height >= vh * 0.75
}

function parseColor(color) {
  if (!color || color === 'transparent') return null

  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
  if (rgba) {
    const alpha = rgba[4] !== undefined ? Number(rgba[4]) : 1
    if (alpha <= 0.04 || alpha < OPAQUE_ALPHA) return null
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])]
  }

  if (typeof document === 'undefined') return null

  const probe = document.createElement('span')
  probe.style.color = color
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()

  if (!resolved || resolved === 'transparent') return null
  if (resolved === color) return null
  return parseColor(resolved)
}

function parseGradientColors(backgroundImage) {
  if (!backgroundImage || backgroundImage === 'none') return null
  const matches = backgroundImage.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi)
  if (!matches?.length) return null
  const colors = matches.map(parseColor).filter(Boolean)
  if (!colors.length) return null
  return colors.reduce(
    (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
    [0, 0, 0],
  ).map((value) => value / colors.length)
}

function readPseudoBackground(el, pseudo) {
  if (!(el instanceof Element)) return null
  const style = getComputedStyle(el, pseudo)
  const solid = parseColor(style.backgroundColor)
  if (solid) return solid
  return parseGradientColors(style.backgroundImage)
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

  return parseColor(getComputedStyle(document.body).backgroundColor) ?? [248, 250, 252]
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

function pointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function rectIntersectsViewport(rect) {
  return rect.bottom > 0
    && rect.top < window.innerHeight
    && rect.right > 0
    && rect.left < window.innerWidth
}

function pointNearSample(x, y, rect, { allowViewportCover = false } = {}) {
  if (pointInRect(x, y, rect)) return true
  if (!allowViewportCover) return false

  // Fixed/full-viewport layers (e.g. about-us bg video) — sample while visible on screen.
  return coversViewport(rect) && rectIntersectsViewport(rect)
}

function readBackgroundAtPoint(target) {
  if (!(target instanceof Element)) return null

  const section = target.closest('.home-section')
  if (section instanceof Element) {
    const sectionBg = section.querySelector(':scope > .home-section__bg')
    if (sectionBg instanceof Element) {
      const solid = parseColor(getComputedStyle(sectionBg).backgroundColor)
      if (solid) return solid
    }
  }

  const hero = target.closest('.home-hero')
  if (hero instanceof Element) {
    const media = hero.querySelector('.home-hero__media')
    if (media instanceof Element) {
      const beforeBg = readPseudoBackground(media, '::before')
      if (beforeBg) return beforeBg

      const mediaStyle = getComputedStyle(media)
      const fromMedia = parseColor(mediaStyle.backgroundColor)
        ?? rgbStopsFromBackgroundValue(mediaStyle.backgroundImage)
      if (fromMedia) return fromMedia
    }
  }

  return readBackground(target)
}

export function withSidebarHidden(excludeRoot, fn) {
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

function fillCanvasSolid(canvas, rgb) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return canvas
  ctx.fillStyle = `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

function rgbStopsFromBackgroundValue(backgroundValue) {
  if (!backgroundValue || backgroundValue === 'none') return null

  const matches = backgroundValue.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi) ?? []
  const rgbs = matches.map(parseColor).filter(Boolean)
  if (!rgbs.length) return null

  if (rgbs.length === 1) return rgbs[0]

  return rgbs
    .reduce((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0])
    .map((value) => value / rgbs.length)
}

function readWarpBackgroundValue(warpRoot) {
  if (!(warpRoot instanceof Element)) return null

  const datasetValue = warpRoot.getAttribute('data-warp-background')?.trim()
  if (datasetValue) return datasetValue

  const stage = warpRoot.querySelector('.warp-background__stage')
  const stageStyle = stage ? getComputedStyle(stage) : null
  const cssVar = stageStyle?.getPropertyValue('--warp-background')?.trim()
    || getComputedStyle(warpRoot).getPropertyValue('--warp-background')?.trim()
  if (cssVar) return cssVar

  const rootStyle = getComputedStyle(warpRoot)
  if (rootStyle.backgroundImage && rootStyle.backgroundImage !== 'none') {
    return rootStyle.backgroundImage
  }

  return 'linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)'
}

function fillCanvasFromBackgroundValue(canvas, backgroundValue) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || !backgroundValue || backgroundValue === 'none') return null

  const colors = backgroundValue.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi) ?? []

  if (colors.length >= 2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    return canvas
  }

  if (colors.length === 1) {
    const solid = parseColor(colors[0])
    if (solid) return fillCanvasSolid(canvas, solid)
  }

  return null
}

function fillCanvasFromCssBackground(canvas, el) {
  if (!(el instanceof Element)) return null

  const style = getComputedStyle(el)
  const fromImage = fillCanvasFromBackgroundValue(canvas, style.backgroundImage)
  if (fromImage) return fromImage

  const solid = parseColor(style.backgroundColor)
  if (solid) return fillCanvasSolid(canvas, solid)

  return null
}

function getVisibleWarpBackground() {
  if (isHomeBackgroundVideoActive()) return null

  const warp = document.querySelector('.home-hero__warp.warp-background, .home-hero__warp, .warp-background')
  if (!(warp instanceof Element) || !isMediaVisible(warp)) return null
  return warp
}

function fillCanvasFromWarp(canvas, warpRoot) {
  if (!(warpRoot instanceof Element)) return null

  const backgroundValue = readWarpBackgroundValue(warpRoot)
  if (backgroundValue && fillCanvasFromBackgroundValue(canvas, backgroundValue)) {
    return canvas
  }

  return fillCanvasFromCssBackground(canvas, warpRoot)
}

export function readWarpBackgroundRgb(warpRoot) {
  const backgroundValue = readWarpBackgroundValue(warpRoot)
  return rgbStopsFromBackgroundValue(backgroundValue)
}

function drawVideoRegion(canvas, video, x, y) {
  if (!(video instanceof HTMLVideoElement) || video.readyState < 2) return false

  const mapped = mapCoverPointToSource(video, x, y)
  if (!mapped) return false

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false

  const half = canvas.width / 2
  try {
    ctx.drawImage(
      video,
      mapped.px - half,
      mapped.py - half,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    return true
  } catch {
    return false
  }
}

function drawCanvasRegion(canvas, sourceCanvas, x, y) {
  const rect = sourceCanvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false

  const nx = (x - rect.left) / rect.width
  const ny = (y - rect.top) / rect.height
  const half = canvas.width / 2
  const sx = nx * sourceCanvas.width - half
  const sy = ny * sourceCanvas.height - half

  try {
    ctx.drawImage(
      sourceCanvas,
      sx,
      sy,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    return true
  } catch {
    return false
  }
}

export function captureBackgroundSampleCanvas(musicEl, size = BACKGROUND_SAMPLE_SIZE) {
  if (!musicEl) return { canvas: null, rgbHint: null }

  const rect = musicEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return { canvas: null, rgbHint: null }

  const sampleX = rect.left + rect.width * 0.5
  const sampleY = rect.top + rect.height * 0.5

  return withSidebarHidden(musicEl, () => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const target = document.elementFromPoint(sampleX, sampleY)

    // Warp only when the sample point is actually over the hero warp layer.
    const warp = getVisibleWarpBackground()
    if (warp && pointInRect(sampleX, sampleY, warp.getBoundingClientRect())) {
      const rgbHint = readWarpBackgroundRgb(warp)
      if (rgbHint) {
        fillCanvasFromWarp(canvas, warp)
        return { canvas, rgbHint }
      }
    }

    for (const sourceCanvas of getBackgroundCanvases()) {
      const cRect = sourceCanvas.getBoundingClientRect()
      if (!pointInRect(sampleX, sampleY, cRect)) continue
      if (drawCanvasRegion(canvas, sourceCanvas, sampleX, sampleY)) {
        return { canvas, rgbHint: null }
      }
    }

    for (const video of getBackgroundVideos()) {
      const vRect = video.getBoundingClientRect()
      if (!pointNearSample(sampleX, sampleY, vRect, { allowViewportCover: true })) continue
      if (drawVideoRegion(canvas, video, sampleX, sampleY)) {
        return { canvas, rgbHint: null }
      }
    }

    if (target instanceof Element) {
      const rgbHint = readBackgroundAtPoint(target)
      if (rgbHint) {
        fillCanvasSolid(canvas, rgbHint)
        return { canvas, rgbHint }
      }

      if (fillCanvasFromCssBackground(canvas, target)) {
        const style = getComputedStyle(target)
        const cssHint = rgbStopsFromBackgroundValue(style.backgroundImage)
          ?? parseColor(style.backgroundColor)
        return { canvas, rgbHint: cssHint }
      }
    }

    const fallback = readBackgroundAtPoint(target) ?? readBackground(document.body)
    fillCanvasSolid(canvas, fallback)
    return { canvas, rgbHint: fallback }
  })
}

export function bindBackgroundVideoSampling(onFrame) {
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
