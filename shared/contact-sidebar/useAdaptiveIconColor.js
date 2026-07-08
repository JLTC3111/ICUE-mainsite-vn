import { useCallback, useEffect, useState } from 'react'

const COLOR_PROBE = typeof document !== 'undefined' ? document.createElement('span') : null

function parseColor(color) {
  if (!color || color === 'transparent') return null

  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
  if (rgba) {
    const alpha = rgba[4] !== undefined ? Number(rgba[4]) : 1
    if (alpha <= 0.04) return null
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

export function useAdaptiveIconColor(ref, enabled = true) {
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
        return readBackground(target)
      })
      .filter(Boolean)

    if (!samples.length) return
    setColor(pickIconColor(averageRgb(samples)))
  }, [enabled, ref])

  useEffect(() => {
    if (!enabled) return undefined
    sample()
    window.addEventListener('scroll', sample, { passive: true, capture: true })
    window.addEventListener('resize', sample)
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', sample)
    viewport?.addEventListener('scroll', sample)
    const id = window.setInterval(sample, 800)
    return () => {
      window.removeEventListener('scroll', sample, true)
      window.removeEventListener('resize', sample)
      viewport?.removeEventListener('resize', sample)
      viewport?.removeEventListener('scroll', sample)
      window.clearInterval(id)
    }
  }, [enabled, sample])

  return color
}
