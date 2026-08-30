import { useCallback, useEffect, useRef, useState } from 'react'
import { readBackgroundSampleRgb } from './backgroundSampling.js'

const FALLBACK_COLOR = '#ffffff'
const DARK_COLOR = '#0a1a3a'
const DARK_RGB = [10, 26, 58]
const SAMPLE_THROTTLE_MS = 120

function relativeLuminance(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3 || !rgb.every(Number.isFinite)) return null
  const channel = (value) => {
    const normalized = Math.min(Math.max(value, 0), 255) / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

function contrastRatio(first, second) {
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

function pickBarColor(rgb) {
  if (!rgb) return FALLBACK_COLOR

  const backgroundLuminance = relativeLuminance(rgb)
  const darkLuminance = relativeLuminance(DARK_RGB)
  if (backgroundLuminance == null || darkLuminance == null) return FALLBACK_COLOR

  const whiteContrast = contrastRatio(backgroundLuminance, 1)
  const darkContrast = contrastRatio(backgroundLuminance, darkLuminance)

  if (whiteContrast >= darkContrast && whiteContrast >= 3) return FALLBACK_COLOR
  if (darkContrast >= 3) return DARK_COLOR

  return backgroundLuminance > 0.58 ? DARK_COLOR : FALLBACK_COLOR
}

function resolveMusicBarColor(musicEl) {
  if (!musicEl) return FALLBACK_COLOR
  return pickBarColor(readBackgroundSampleRgb(musicEl))
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
    window.addEventListener('icue:aboutUsTheme', scheduleSample)
    window.addEventListener('icue:aboutUsThemeManagerReady', scheduleSample)
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
      attributeFilter: ['data-home-bg-video', 'data-aboutus-bg-video', 'data-about-theme'],
    })

    return () => {
      if (sampleTimer !== null) window.clearTimeout(sampleTimer)
      window.removeEventListener('scroll', scheduleSample, true)
      window.removeEventListener('resize', scheduleSample)
      window.removeEventListener('icue:legacy-page-ready', scheduleSample)
      window.removeEventListener('icue:aboutUsVideoEnabled', scheduleSample)
      window.removeEventListener('icue:homeVideoEnabled', scheduleSample)
      window.removeEventListener('icue:aboutUsTheme', scheduleSample)
      window.removeEventListener('icue:aboutUsThemeManagerReady', scheduleSample)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      viewport?.removeEventListener('resize', scheduleSample)
      viewport?.removeEventListener('scroll', scheduleSample)
      observer?.disconnect()
      rootObserver.disconnect()
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
