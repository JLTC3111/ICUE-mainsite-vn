import { useEffect, useRef } from 'react'
import './MotionText.css'

const DEFAULT_PARTICLE_COLORS = ['#b0356f', '#3c7d55', '#c08a1c']

/**
 * A small, dependency-free interpretation of React Bits' Particle Text idea.
 * The readable DOM text remains the layout and accessibility source; canvas is
 * only a progressively enhanced visual layer for pointer-capable visitors.
 */
export function ParticleText({ text, className = '', colors = DEFAULT_PARTICLE_COLORS }) {
  const rootRef = useRef(null)
  const colorKey = colors.join('|')

  useEffect(() => {
    const root = rootRef.current
    const canvas = root?.querySelector('canvas')
    const fallback = root?.querySelector('.ct-particle-text__fallback')
    if (!root || !canvas || !fallback) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (
      reduceMotion.matches
      || !finePointer.matches
      || typeof ResizeObserver === 'undefined'
    ) return undefined

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const padding = 15
    const particleGap = 2
    const palette = colorKey.split('|').filter(Boolean)
    const pointer = { active: false, x: 0, y: 0 }
    let particles = []
    let frame = 0
    let cancelled = false
    let resizeFrame = 0
    let idleCallback = 0
    let initialized = false
    let interactionRect = null
    let compositionKey = ''

    const sample = document.createElement('canvas')
    const sampleCtx = sample.getContext('2d', { willReadFrequently: true })
    if (!sampleCtx) return undefined

    const draw = () => {
      frame = 0
      const width = Number(canvas.dataset.cssWidth || 0)
      const height = Number(canvas.dataset.cssHeight || 0)
      if (!width || !height) return

      ctx.clearRect(0, 0, width, height)
      let movement = 0

      particles.forEach((particle) => {
        if (pointer.active) {
          const dx = particle.x - pointer.x
          const dy = particle.y - pointer.y
          const distance = Math.hypot(dx, dy) || 1
          const radius = 48
          if (distance < radius) {
            const force = (1 - distance / radius) * 1.55
            particle.vx += (dx / distance) * force
            particle.vy += (dy / distance) * force
          }
        }

        particle.vx += (particle.homeX - particle.x) * 0.065
        particle.vy += (particle.homeY - particle.y) * 0.065
        particle.vx *= 0.82
        particle.vy *= 0.82
        particle.x += particle.vx
        particle.y += particle.vy
        movement += Math.abs(particle.vx) + Math.abs(particle.vy)

        ctx.fillStyle = particle.color
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size)
      })

      // A pointer move supplies one impulse. Leaving `active` true while the
      // pointer is parked over the text would keep this loop running at 60fps
      // indefinitely, even after every particle had visually settled.
      pointer.active = false

      if (movement > particles.length * 0.004) {
        frame = window.requestAnimationFrame(draw)
      }
    }

    const startDrawing = () => {
      if (!frame) frame = window.requestAnimationFrame(draw)
    }

    const compose = () => {
      const rect = fallback.getBoundingClientRect()
      const textWidth = Math.max(1, Math.ceil(rect.width))
      const textHeight = Math.max(1, Math.ceil(rect.height))
      const width = textWidth + padding * 2
      const height = textHeight + padding * 2
      const ratio = Math.min(window.devicePixelRatio || 1, 2)

      const style = window.getComputedStyle(fallback)
      const nextCompositionKey = [
        width,
        height,
        ratio,
        style.fontWeight,
        style.fontSize,
        style.fontFamily,
        text,
        colorKey,
      ].join('|')
      if (nextCompositionKey === compositionKey) return
      compositionKey = nextCompositionKey

      canvas.dataset.cssWidth = String(width)
      canvas.dataset.cssHeight = String(height)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.style.left = `${-padding}px`
      canvas.style.top = `${-padding}px`
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      sample.width = width
      sample.height = height

      sampleCtx.fillStyle = '#000'
      sampleCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      sampleCtx.textAlign = 'center'
      sampleCtx.textBaseline = 'middle'
      sampleCtx.fillText(String(text), width / 2, height / 2)

      const pixels = sampleCtx.getImageData(0, 0, width, height).data
      const nextParticles = []
      for (let y = 0; y < height; y += particleGap) {
        for (let x = 0; x < width; x += particleGap) {
          if (pixels[(y * width + x) * 4 + 3] < 96) continue
          const colorPosition = Math.min(
            palette.length - 1,
            Math.floor(((x + y * 0.28) / (width + height * 0.28)) * palette.length),
          )
          nextParticles.push({
            homeX: x,
            homeY: y,
            x: x + (Math.random() - 0.5) * 24,
            y: y + (Math.random() - 0.5) * 24,
            vx: 0,
            vy: 0,
            size: 1.45,
            color: palette[colorPosition] || DEFAULT_PARTICLE_COLORS[0],
          })
        }
      }

      particles = nextParticles
      interactionRect = root.getBoundingClientRect()
      startDrawing()
      root.classList.add('is-particle-ready')
    }

    const scheduleCompose = () => {
      if (!initialized) return
      window.cancelAnimationFrame(resizeFrame)
      window.cancelAnimationFrame(frame)
      frame = 0
      resizeFrame = window.requestAnimationFrame(compose)
    }

    const observer = new ResizeObserver(scheduleCompose)
    observer.observe(fallback)

    const onPointerEnter = () => {
      interactionRect = root.getBoundingClientRect()
    }
    const onPointerMove = (event) => {
      const rect = interactionRect || root.getBoundingClientRect()
      pointer.active = true
      pointer.x = event.clientX - rect.left + padding
      pointer.y = event.clientY - rect.top + padding
      startDrawing()
    }
    const onPointerLeave = () => {
      pointer.active = false
      interactionRect = null
      startDrawing()
    }

    root.addEventListener('pointerenter', onPointerEnter, { passive: true })
    root.addEventListener('pointermove', onPointerMove, { passive: true })
    root.addEventListener('pointerleave', onPointerLeave)

    Promise.resolve(document.fonts?.ready).then(() => {
      if (cancelled) return

      const initialize = () => {
        if (cancelled) return
        initialized = true
        scheduleCompose()
      }

      // The gradient DOM fallback is already complete and readable. Building
      // the progressive canvas layer after the first paint keeps that work off
      // the contact page's critical rendering path.
      if (typeof window.requestIdleCallback === 'function') {
        idleCallback = window.requestIdleCallback(initialize, { timeout: 900 })
      } else {
        idleCallback = window.setTimeout(initialize, 0)
      }
    })

    return () => {
      cancelled = true
      observer.disconnect()
      root.removeEventListener('pointerenter', onPointerEnter)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerleave', onPointerLeave)
      root.classList.remove('is-particle-ready')
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallback)
      } else {
        window.clearTimeout(idleCallback)
      }
      window.cancelAnimationFrame(resizeFrame)
      window.cancelAnimationFrame(frame)
    }
  }, [text, colorKey])

  return (
    <span
      ref={rootRef}
      className={`ct-particle-text${className ? ` ${className}` : ''}`}
      aria-label={text}
    >
      <span className="ct-particle-text__fallback" aria-hidden="true">
        {text}
      </span>
      <canvas className="ct-particle-text__canvas" aria-hidden="true" />
    </span>
  )
}

/** A compact arrival-board reveal with one hinged flap for each character. */
export function CompactFlapText({ text, className = '' }) {
  const characters = Array.from(String(text).normalize('NFC'))

  return (
    <span
      className={`ct-split-flap${className ? ` ${className}` : ''}`}
      aria-label={text}
    >
      <span className="ct-split-flap__visual" aria-hidden="true">
        {characters.map((character, index) => (
          character === ' '
            ? <span className="ct-split-flap__space" key={`space-${index}`} />
            : (
              <span
                className="ct-split-flap__cell"
                key={`${character}-${index}`}
                style={{ '--ct-flap-delay': `${120 + index * 65}ms` }}
              >
                <span className="ct-split-flap__glyph">{character}</span>
              </span>
            )
        ))}
      </span>
    </span>
  )
}
