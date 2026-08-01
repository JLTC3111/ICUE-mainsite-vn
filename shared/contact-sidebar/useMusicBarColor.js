import { useCallback, useEffect, useRef, useState } from 'react'
import chroma from 'chroma-js'
import { FastAverageColor } from 'fast-average-color'
import {
  BACKGROUND_SAMPLE_SIZE,
  bindBackgroundVideoSampling,
  captureBackgroundSampleCanvas,
} from './backgroundSampling.js'

const fac = new FastAverageColor()
const FALLBACK_COLOR = '#ffffff'
const SAMPLE_THROTTLE_MS = 120

function pickBarColor(rgb) {
  if (!rgb) return FALLBACK_COLOR

  let background
  try {
    background = chroma(rgb)
  } catch {
    return FALLBACK_COLOR
  }

  const white = chroma('#ffffff')
  const dark = chroma('#0a1a3a')
  const whiteContrast = chroma.contrast(background, white)
  const darkContrast = chroma.contrast(background, dark)

  if (whiteContrast >= darkContrast && whiteContrast >= 3) return white.hex()
  if (darkContrast >= 3) return dark.hex()

  return background.luminance() > 0.58 ? dark.hex() : white.hex()
}

async function extractBarColorFromCanvas(canvas, rgbHint = null) {
  if (rgbHint) return pickBarColor(rgbHint)
  if (!canvas) return FALLBACK_COLOR

  try {
    const result = await fac.getColorAsync(canvas, {
      algorithm: 'dominant',
      // Ignore only transparent pixels. Light and dark opaque pixels are the
      // actual background signal and must remain available for contrast
      // selection, especially for bright video frames and WebGL canvases.
      ignoredColor: [0, 0, 0, 0],
      defaultColor: [248, 250, 252, 255],
    })
    return pickBarColor(result?.rgb)
  } catch {
    return FALLBACK_COLOR
  }
}

async function resolveMusicBarColor(musicEl) {
  if (!musicEl) return FALLBACK_COLOR

  const { canvas, rgbHint } = captureBackgroundSampleCanvas(musicEl, BACKGROUND_SAMPLE_SIZE)
  return extractBarColorFromCanvas(canvas, rgbHint)
}

export function useMusicBarColor(barRef, enabled = true, contentKey = '') {
  const [color, setColor] = useState(FALLBACK_COLOR)
  const samplingRef = useRef(false)
  const mountedRef = useRef(true)

  const sample = useCallback(async () => {
    if (!enabled) return
    const el = barRef.current
    if (!el || samplingRef.current) return

    samplingRef.current = true
    try {
      const nextColor = await resolveMusicBarColor(el)
      if (mountedRef.current) {
        setColor((prev) => (prev === nextColor ? prev : nextColor))
      }
    } finally {
      samplingRef.current = false
    }
  }, [barRef, enabled])

  useEffect(() => {
    if (!enabled) return undefined

    let sampleTimer = null
    let lastSampleAt = 0

    const runSample = () => {
      if (document.hidden) return
      lastSampleAt = performance.now()
      void sample()
    }

    const scheduleSample = () => {
      if (document.hidden) return
      const elapsed = performance.now() - lastSampleAt
      if (elapsed >= SAMPLE_THROTTLE_MS) {
        if (sampleTimer !== null) {
          window.clearTimeout(sampleTimer)
          sampleTimer = null
        }
        runSample()
        return
      }

      if (sampleTimer !== null) return
      sampleTimer = window.setTimeout(() => {
        sampleTimer = null
        runSample()
      }, SAMPLE_THROTTLE_MS - elapsed)
    }

    runSample()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (sampleTimer !== null) window.clearTimeout(sampleTimer)
        sampleTimer = null
      } else {
        scheduleSample()
      }
    }

    window.addEventListener('scroll', scheduleSample, { passive: true, capture: true })
    window.addEventListener('resize', scheduleSample)
    window.addEventListener('icue:legacy-page-ready', scheduleSample)
    window.addEventListener('icue:aboutUsVideoEnabled', scheduleSample)
    window.addEventListener('icue:homeVideoEnabled', scheduleSample)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', scheduleSample)
    viewport?.addEventListener('scroll', scheduleSample)

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

    const rootObserver = new MutationObserver(scheduleSample)
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-home-bg-video', 'data-aboutus-bg-video'],
    })

    const unbindVideos = bindBackgroundVideoSampling(scheduleSample)
    const id = window.setInterval(scheduleSample, 500)

    return () => {
      if (sampleTimer !== null) window.clearTimeout(sampleTimer)
      window.removeEventListener('scroll', scheduleSample, true)
      window.removeEventListener('resize', scheduleSample)
      window.removeEventListener('icue:legacy-page-ready', scheduleSample)
      window.removeEventListener('icue:aboutUsVideoEnabled', scheduleSample)
      window.removeEventListener('icue:homeVideoEnabled', scheduleSample)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      viewport?.removeEventListener('resize', scheduleSample)
      viewport?.removeEventListener('scroll', scheduleSample)
      observer?.disconnect()
      rootObserver.disconnect()
      unbindVideos()
      window.clearInterval(id)
    }
  }, [contentKey, enabled, sample])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return color
}
