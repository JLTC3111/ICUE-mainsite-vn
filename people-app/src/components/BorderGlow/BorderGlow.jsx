import { useRef, useCallback, useEffect } from 'react'
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

  const getCenterOfElement = useCallback((el) => {
    const { width, height } = el.getBoundingClientRect()
    return [width / 2, height / 2]
  }, [])

  const getEdgeProximity = useCallback((el, x, y) => {
    const [cx, cy] = getCenterOfElement(el)
    const dx = x - cx
    const dy = y - cy
    let kx = Infinity
    let ky = Infinity
    if (dx !== 0) kx = cx / Math.abs(dx)
    if (dy !== 0) ky = cy / Math.abs(dy)
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
  }, [getCenterOfElement])

  const getCursorAngle = useCallback((el, x, y) => {
    const [cx, cy] = getCenterOfElement(el)
    const dx = x - cx
    const dy = y - cy
    if (dx === 0 && dy === 0) return 0
    const radians = Math.atan2(dy, dx)
    let degrees = radians * (180 / Math.PI) + 90
    if (degrees < 0) degrees += 360
    return degrees
  }, [getCenterOfElement])

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    card.style.setProperty('--edge-proximity', `${(getEdgeProximity(card, x, y) * 100).toFixed(3)}`)
    card.style.setProperty('--cursor-angle', `${getCursorAngle(card, x, y).toFixed(3)}deg`)
  }, [getEdgeProximity, getCursorAngle])

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

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card ${className}`.trim()}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        '--fill-opacity': fillOpacity,
        ...buildGlowVars(glowColor, glowIntensity),
        ...buildGradientVars(colors),
      }}
    >
      <span className="edge-light" aria-hidden="true" />
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  )
}

export default BorderGlow
