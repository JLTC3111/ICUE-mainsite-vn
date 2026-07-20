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
      ignoredColor: [
        [255, 255, 255, 255, 24],
        [0, 0, 0, 255, 24],
      ],
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

  const sample = useCallback(async () => {
    if (!enabled) return
    const el = barRef.current
    if (!el || samplingRef.current) return

    samplingRef.current = true
    try {
      const nextColor = await resolveMusicBarColor(el)
      setColor((prev) => (prev === nextColor ? prev : nextColor))
    } finally {
      samplingRef.current = false
    }
  }, [barRef, contentKey, enabled])

  useEffect(() => {
    if (!enabled) return undefined

    let debounceId = null
    const scheduleSample = () => {
      if (debounceId) window.clearTimeout(debounceId)
      debounceId = window.setTimeout(() => {
        sample()
      }, 64)
    }

    sample()

    window.addEventListener('scroll', scheduleSample, { passive: true, capture: true })
    window.addEventListener('resize', scheduleSample)
    window.addEventListener('icue:legacy-page-ready', scheduleSample)
    window.addEventListener('icue:aboutUsVideoEnabled', scheduleSample)
    window.addEventListener('icue:homeVideoEnabled', scheduleSample)

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
    const id = window.setInterval(sample, 700)

    return () => {
      if (debounceId) window.clearTimeout(debounceId)
      window.removeEventListener('scroll', scheduleSample, true)
      window.removeEventListener('resize', scheduleSample)
      window.removeEventListener('icue:legacy-page-ready', scheduleSample)
      window.removeEventListener('icue:aboutUsVideoEnabled', scheduleSample)
      window.removeEventListener('icue:homeVideoEnabled', scheduleSample)
      viewport?.removeEventListener('resize', scheduleSample)
      viewport?.removeEventListener('scroll', scheduleSample)
      observer?.disconnect()
      rootObserver.disconnect()
      unbindVideos()
      window.clearInterval(id)
    }
  }, [contentKey, enabled, sample])

  useEffect(() => () => {
    fac.destroy()
  }, [])

  return color
}
