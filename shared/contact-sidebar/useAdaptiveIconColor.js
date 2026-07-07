import { useCallback, useEffect, useState } from 'react'

function parseRgb(color) {
  if (!color || color === 'transparent') return null
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function luminance([r, g, b]) {
  const channel = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function readBackground(el) {
  let node = el
  while (node && node !== document.documentElement) {
    const bg = parseRgb(getComputedStyle(node).backgroundColor)
    if (bg) return bg
    node = node.parentElement
  }
  return [255, 255, 255]
}

function pickIconColor(bgRgb) {
  const lum = luminance(bgRgb)
  if (lum < 0.42) return '#c8ff00'
  if (lum > 0.82) return '#111316'
  return lum < 0.58 ? '#ffffff' : '#111316'
}

export function useAdaptiveIconColor(ref) {
  const [color, setColor] = useState('#111316')

  const sample = useCallback(() => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    if (x <= 0 || y <= 0) return

    const prev = el.style.pointerEvents
    el.style.pointerEvents = 'none'
    const target = document.elementFromPoint(x, y)
    el.style.pointerEvents = prev

    if (!target) return
    setColor(pickIconColor(readBackground(target)))
  }, [ref])

  useEffect(() => {
    sample()
    window.addEventListener('scroll', sample, { passive: true })
    window.addEventListener('resize', sample)
    const id = window.setInterval(sample, 1200)
    return () => {
      window.removeEventListener('scroll', sample)
      window.removeEventListener('resize', sample)
      window.clearInterval(id)
    }
  }, [sample])

  return color
}
