import { memo, useRef, useCallback, useEffect, useMemo } from 'react'
import './BorderGlow.css'

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/)
  if (!match) return { h: 210, s: 70, l: 60 }
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) }
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor)
  const base = `${h}deg ${s}% ${l}%`
  const opacities = [100, 60, 50, 40, 30, 20, 10]
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10']
  const vars = {}
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`
  }
  return vars
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%']
const GRADIENT_KEYS = [
  '--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four',
  '--gradient-five', '--gradient-six', '--gradient-seven',
]
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1]

function buildGradientVars(colors) {
  const vars = {}
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)]
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`
  return vars
}

function easeOutCubic(x) { return 1 - (1 - x) ** 3 }
function easeInCubic(x) { return x * x * x }

function animateValue({
  start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd,
}) {
  let frameId = null
  let timeoutId = null
  let cancelled = false
  let startedAt = 0

  function tick(now) {
    if (cancelled) return
    const elapsed = now - startedAt
    const t = Math.min(elapsed / duration, 1)
    onUpdate(start + (end - start) * ease(t))
    if (t < 1) frameId = requestAnimationFrame(tick)
    else if (onEnd) onEnd()
  }

  timeoutId = window.setTimeout(() => {
    startedAt = performance.now()
    frameId = requestAnimationFrame(tick)
  }, delay)

  return () => {
    cancelled = true
    window.clearTimeout(timeoutId)
    if (frameId !== null) cancelAnimationFrame(frameId)
  }
}

function BorderGlow({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '210 70 60',
  backgroundColor = 'rgba(255, 255, 255, 0.72)',
  borderRadius = 14,
  glowRadius = 28,
  glowIntensity = 0.85,
  coneSpread = 25,
  animated = false,
  colors = ['#368adf', '#1db7ff', '#4d5053'],
  fillOpacity = 0.35,
}) {
  const cardRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef(0)

  /*
   * One rect read per animation frame, not three per event.
   *
   * The original called getBoundingClientRect() once in the handler and again
   * inside each of getEdgeProximity and getCursorAngle. Every pointermove
   * therefore forced three synchronous layouts, and pointermove fires at
   * device sample rate — on a grid of these cards that was the single most
   * expensive thing on the page.
   *
   * Now the event only records coordinates; the measure-and-write happens once
   * in a rAF callback, and both values come from the same rect.
   */
  const applyPointer = useCallback(() => {
    frameRef.current = 0
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const cx = rect.width / 2
    const cy = rect.height / 2
    const dx = pointerRef.current.x - rect.left - cx
    const dy = pointerRef.current.y - rect.top - cy

    let kx = Infinity
    let ky = Infinity
    if (dx !== 0) kx = cx / Math.abs(dx)
    if (dy !== 0) ky = cy / Math.abs(dy)
    const proximity = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)

    let angle = 0
    if (dx !== 0 || dy !== 0) {
      angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      if (angle < 0) angle += 360
    }

    card.style.setProperty('--edge-proximity', (proximity * 100).toFixed(3))
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`)
  }, [])

  const handlePointerMove = useCallback((event) => {
    pointerRef.current.x = event.clientX
    pointerRef.current.y = event.clientY
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(applyPointer)
  }, [applyPointer])

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  useEffect(() => {
    if (!animated || !cardRef.current) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const card = cardRef.current
    const angleStart = 110
    const angleEnd = 465
    card.classList.add('sweep-active')
    card.style.setProperty('--cursor-angle', `${angleStart}deg`)

    const cancelAnimations = []
    cancelAnimations.push(animateValue({
      duration: 500,
      onUpdate: (v) => card.style.setProperty('--edge-proximity', `${v}`),
    }))
    cancelAnimations.push(animateValue({
      ease: easeInCubic,
      duration: 1500,
      end: 50,
      onUpdate: (v) => {
        card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`)
      },
    }))
    cancelAnimations.push(animateValue({
      ease: easeOutCubic,
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      onUpdate: (v) => {
        card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`)
      },
    }))
    cancelAnimations.push(animateValue({
      ease: easeInCubic,
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      onUpdate: (v) => card.style.setProperty('--edge-proximity', `${v}`),
      onEnd: () => card.classList.remove('sweep-active'),
    }))

    return () => {
      cancelAnimations.forEach((cancel) => cancel())
      card.classList.remove('sweep-active')
    }
  }, [animated])

  /*
   * The gradient and glow variables are pure functions of the colour props, but
   * building them allocates fourteen strings and two objects. Recomputing that
   * on every parent render — for every card in a grid — was pointless churn,
   * and a fresh `style` object identity also defeated DOM diffing.
   *
   * `colors` is an array, so it is keyed on its contents rather than identity;
   * callers overwhelmingly pass an inline literal.
   */
  const colorKey = colors.join('|')
  const styleVars = useMemo(() => ({
    '--card-bg': backgroundColor,
    '--edge-sensitivity': edgeSensitivity,
    '--border-radius': `${borderRadius}px`,
    '--glow-padding': `${glowRadius}px`,
    '--cone-spread': coneSpread,
    '--fill-opacity': fillOpacity,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colorKey.split('|')),
  }), [
    backgroundColor, edgeSensitivity, borderRadius, glowRadius, coneSpread,
    fillOpacity, glowColor, glowIntensity, colorKey,
  ])

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card ${className}`.trim()}
      style={styleVars}
    >
      <span className="edge-light" aria-hidden="true" />
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  )
}

/*
 * Memoised because these are laid out in grids: DepartmentsGrid, MagicBento and
 * the profile panels each render many at once, and a parent state change (a
 * hover, a filter, a locale switch) otherwise re-rendered every card.
 */
export default memo(BorderGlow)
