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

function sampleBitmapAt(bitmap, rect, x, y) {
  const ctx = getSampleContext()
  if (!ctx || !bitmap || rect.width <= 0 || rect.height <= 0) return null

  try {
    const px = ((x - rect.left) / rect.width) * (bitmap.width || rect.width)
    const py = ((y - rect.top) / rect.height) * (bitmap.height || rect.height)
    ctx.clearRect(0, 0, 6, 6)
    ctx.drawImage(bitmap, px - 3, py - 3, 6, 6, 0, 0, 6, 6)
    return averageImageData(ctx.getImageData(0, 0, 6, 6).data)
  } catch {
    return null
  }
}

function sampleRenderedMediaAt(x, y) {
  const samples = []

  document.querySelectorAll('video.video-bg').forEach((video) => {
    if (!(video instanceof HTMLVideoElement) || video.readyState < 2) return
    const rect = video.getBoundingClientRect()
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return
    const sample = sampleBitmapAt(video, rect, x, y)
    if (sample) samples.push(sample)
  })

  document.querySelectorAll('canvas').forEach((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) return
    const style = getComputedStyle(canvas)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return
    const rect = canvas.getBoundingClientRect()
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return
    const sample = sampleBitmapAt(canvas, rect, x, y)
    if (sample) samples.push(sample)
  })

  return averageRgb(samples)
}

function readVisibleBackground(x, y, target) {
  const samples = []
  const dom = target ? readBackground(target) : null
  const media = sampleRenderedMediaAt(x, y)

  if (dom) samples.push(dom)
  if (media) samples.push(media)

  return averageRgb(samples)
}

function pickIconColor(bgRgb) {
  const lum = luminance(bgRgb)
  if (lum < 0.42) return '#ffffff'
  if (lum > 0.82) return '#000000'
  return lum < 0.58 ? '#ffffff' : '#000000'
}

function sampleTargetAt(x, y, excludeRoot) {
  const sidebar = excludeRoot?.closest('.contact-sidebar')
  const prevPointer = sidebar?.style.pointerEvents
  if (sidebar) sidebar.style.pointerEvents = 'none'

  const target = document.elementFromPoint(x, y)

  if (sidebar) sidebar.style.pointerEvents = prevPointer || ''

  return target
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
    const inset = viewWidth < 768 ? 48 : 28

    const points = [
      [rect.left - inset, rect.top + rect.height * 0.35],
      [rect.left - inset, rect.top + rect.height * 0.65],
      [rect.left - Math.round(inset * 0.65), rect.top + rect.height * 0.5],
      [rect.left - inset, rect.top + rect.height * 0.5],
    ]

    const samples = points
      .map(([x, y]) => {
        const vx = x - offsetX
        const vy = y - offsetY
        if (vx <= 0 || vy <= 0 || vx >= viewWidth || vy >= viewHeight) return null
        const target = sampleTargetAt(x, y, el)
        if (!target) return null
        return readVisibleBackground(x, y, target)
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
      debounceId = window.setTimeout(sample, 60)
    }

    sample()

    window.addEventListener('scroll', sample, { passive: true, capture: true })
    window.addEventListener('resize', sample)
    window.addEventListener('icue:legacy-page-ready', scheduleSample)

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

    const onVideoFrame = () => scheduleSample()
    document.querySelectorAll('video.video-bg').forEach((video) => {
      video.addEventListener('loadeddata', onVideoFrame)
      video.addEventListener('play', onVideoFrame)
    })
    const videoObserver = new MutationObserver(() => {
      document.querySelectorAll('video.video-bg').forEach((video) => {
        if (video.dataset.adaptiveColorBound) return
        video.dataset.adaptiveColorBound = '1'
        video.addEventListener('loadeddata', onVideoFrame)
        video.addEventListener('play', onVideoFrame)
      })
      scheduleSample()
    })
    videoObserver.observe(document.body, { childList: true, subtree: true })

    const id = window.setInterval(sample, 800)

    return () => {
      if (debounceId) window.clearTimeout(debounceId)
      window.removeEventListener('scroll', sample, true)
      window.removeEventListener('resize', sample)
      window.removeEventListener('icue:legacy-page-ready', scheduleSample)
      viewport?.removeEventListener('resize', sample)
      viewport?.removeEventListener('scroll', sample)
      observer?.disconnect()
      videoObserver.disconnect()
      document.querySelectorAll('video.video-bg').forEach((video) => {
        video.removeEventListener('loadeddata', onVideoFrame)
        video.removeEventListener('play', onVideoFrame)
        delete video.dataset.adaptiveColorBound
      })
      window.clearInterval(id)
    }
  }, [contentKey, enabled, sample])

  return color
}
