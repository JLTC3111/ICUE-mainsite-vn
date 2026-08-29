import { useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { useHomeBackgroundVideoEnabled } from '../hooks/useHomeBackgroundVideoEnabled'
import './HeroVideoTitle.css'

const HERO_TITLE_VIDEO_SRC = '/bgVideos/video-text-fifa2026-optimized.mp4'

function getWrappedLines(element) {
  const textNode = element.firstChild
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return [{ text: element.textContent ?? '', rect: element.getBoundingClientRect() }]
  }

  const text = textNode.textContent ?? ''
  const range = document.createRange()
  const lines = []
  let lineStart = 0
  let prevTop = null

  for (let index = 1; index <= text.length; index += 1) {
    range.setStart(textNode, lineStart)
    range.setEnd(textNode, index)
    const rects = range.getClientRects()
    const last = rects[rects.length - 1]
    if (!last) continue

    if (prevTop !== null && last.top > prevTop + 1) {
      range.setStart(textNode, lineStart)
      range.setEnd(textNode, index - 1)
      lines.push({ text: text.slice(lineStart, index - 1), rect: range.getBoundingClientRect() })
      lineStart = index - 1
    }

    prevTop = last.top
  }

  range.setStart(textNode, lineStart)
  range.setEnd(textNode, text.length)
  lines.push({ text: text.slice(lineStart), rect: range.getBoundingClientRect() })

  return lines
}

function escapeSvgText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function buildSvgMaskFromElement(element) {
  const bounds = element.getBoundingClientRect()
  const width = Math.ceil(bounds.width)
  const height = Math.ceil(bounds.height)
  if (width < 1 || height < 1) return null

  const style = getComputedStyle(element)
  await document.fonts.ready
  if (style.font) {
    try {
      await document.fonts.load(style.font)
    } catch {
      // Font already loaded or unavailable — continue with fallback metrics.
    }
  }

  const lines = getWrappedLines(element)
  const textNodes = lines.map((line) => {
    const x = line.rect.left - bounds.left + line.rect.width / 2
    const y = line.rect.top - bounds.top
    return [
      `<text x="${x}" y="${y}" text-anchor="middle"`,
      ' dominant-baseline="text-before-edge"',
      ` textLength="${line.rect.width}" lengthAdjust="spacingAndGlyphs">`,
      escapeSvgText(line.text),
      '</text>',
    ].join('')
  }).join('')

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    `<g fill="#fff" font-family="${escapeSvgText(style.fontFamily)}"`,
    ` font-size="${escapeSvgText(style.fontSize)}"`,
    ` font-style="${escapeSvgText(style.fontStyle)}"`,
    ` font-weight="${escapeSvgText(style.fontWeight)}"`,
    ` font-stretch="${escapeSvgText(style.fontStretch)}"`,
    ` letter-spacing="${escapeSvgText(style.letterSpacing)}">`,
    textNodes,
    '</g></svg>',
  ].join('')

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function HeroVideoTitle({ text }) {
  const shellRef = useRef(null)
  const labelRef = useRef(null)
  const [maskUrl, setMaskUrl] = useState('')
  const prefersReducedMotion = useReducedMotion()
  const bgVideoEnabled = useHomeBackgroundVideoEnabled()
  const useTitleVideo = !bgVideoEnabled && !prefersReducedMotion

  useLayoutEffect(() => {
    if (!useTitleVideo) {
      setMaskUrl('')
      return undefined
    }

    const label = labelRef.current
    if (!label) return undefined

    let frame = 0
    let disposed = false
    let requestVersion = 0

    const updateMask = () => {
      window.cancelAnimationFrame(frame)
      const version = ++requestVersion
      frame = window.requestAnimationFrame(async () => {
        const nextMask = await buildSvgMaskFromElement(label)
        if (!disposed && version === requestVersion && nextMask) setMaskUrl(nextMask)
      })
    }

    updateMask()

    const resizeObserver = new ResizeObserver(updateMask)
    resizeObserver.observe(label)

    const fonts = document.fonts
    fonts?.addEventListener?.('loadingdone', updateMask)

    window.addEventListener('resize', updateMask)

    return () => {
      disposed = true
      requestVersion += 1
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      fonts?.removeEventListener?.('loadingdone', updateMask)
      window.removeEventListener('resize', updateMask)
    }
  }, [text, useTitleVideo])

  if (!useTitleVideo) {
    return (
      <h1
        className={`home-hero__title home-hero__title--static${
          bgVideoEnabled ? ' home-hero__title--shadowed' : ''
        }`}
      >
        {text}
      </h1>
    )
  }

  const maskStyle = maskUrl
    ? {
        WebkitMaskImage: `url("${maskUrl}")`,
        maskImage: `url("${maskUrl}")`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }
    : undefined

  return (
    <h1 ref={shellRef} className="home-hero__title home-hero__title--video">
      <span ref={labelRef} className="home-hero__title-label" aria-hidden="true">
        {text}
      </span>
      <span className="home-hero__title-stack" aria-hidden="true">
        <span className="home-hero__title-fill" style={maskStyle}>
          <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
            <source src={HERO_TITLE_VIDEO_SRC} type="video/mp4" />
          </video>
        </span>
      </span>
      <span className="home-hero__title-sr">{text}</span>
    </h1>
  )
}
