import { useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import './AnimatedThemeToggler.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function polygonCollapsed(point, vertexCount) {
  const pairs = Array.from({ length: vertexCount }, () => point).join(', ')
  return `polygon(${pairs})`
}

// Percentage coords against the snapshot reference box — absolute px on
// ::view-transition-new(root) mis-scale on fractional display zoom (e.g. 150%).
function getThemeTransitionClipPaths(
  variant,
  cx,
  cy,
  maxRadius,
  viewportWidth,
  viewportHeight,
) {
  const toX = (x) => `${(x / viewportWidth) * 100}%`
  const toY = (y) => `${(y / viewportHeight) * 100}%`
  const point = (x, y) => `${toX(x)} ${toY(y)}`
  // circle() % radii resolve against hypot(w, h) / sqrt(2) of the reference box.
  const toRadius = (r) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`

  switch (variant) {
    case 'circle':
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
    case 'square': {
      const halfW = Math.max(cx, viewportWidth - cx)
      const halfH = Math.max(cy, viewportHeight - cy)
      const halfSide = Math.max(halfW, halfH) * 1.05
      const end = [
        point(cx - halfSide, cy - halfSide),
        point(cx + halfSide, cy - halfSide),
        point(cx + halfSide, cy + halfSide),
        point(cx - halfSide, cy + halfSide),
      ].join(', ')
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case 'triangle': {
      const scale = maxRadius * 2.2
      const dx = (Math.sqrt(3) / 2) * scale
      const verts = [
        point(cx, cy - scale),
        point(cx + dx, cy + 0.5 * scale),
        point(cx - dx, cy + 0.5 * scale),
      ].join(', ')
      return [polygonCollapsed(point(cx, cy), 3), `polygon(${verts})`]
    }
    case 'diamond': {
      const R = maxRadius * Math.SQRT2
      const end = [
        point(cx, cy - R),
        point(cx + R, cy),
        point(cx, cy + R),
        point(cx - R, cy),
      ].join(', ')
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case 'hexagon': {
      const R = maxRadius * Math.SQRT2
      const verts = []
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3
        verts.push(point(cx + R * Math.cos(a), cy + R * Math.sin(a)))
      }
      return [
        polygonCollapsed(point(cx, cy), 6),
        `polygon(${verts.join(', ')})`,
      ]
    }
    case 'rectangle': {
      const halfW = Math.max(cx, viewportWidth - cx)
      const halfH = Math.max(cy, viewportHeight - cy)
      const end = [
        point(cx - halfW, cy - halfH),
        point(cx + halfW, cy - halfH),
        point(cx + halfW, cy + halfH),
        point(cx - halfW, cy + halfH),
      ].join(', ')
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case 'star': {
      const R = maxRadius * Math.SQRT2 * 1.03
      const innerRatio = 0.42
      const starPolygon = (radius) => {
        const verts = []
        for (let i = 0; i < 5; i++) {
          const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5
          verts.push(
            point(cx + radius * Math.cos(outerA), cy + radius * Math.sin(outerA)),
          )
          const innerA = outerA + Math.PI / 5
          verts.push(
            point(
              cx + radius * innerRatio * Math.cos(innerA),
              cy + radius * innerRatio * Math.sin(innerA),
            ),
          )
        }
        return `polygon(${verts.join(', ')})`
      }
      const startR = Math.max(2, R * 0.025)
      return [starPolygon(startR), starPolygon(R)]
    }
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
  }
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AnimatedThemeToggler({
  className = '',
  duration = 400,
  variant = 'circle',
  fromCenter = false,
  theme = 'light',
  onThemeChange,
  instant = false,
  label,
  'aria-label': ariaLabel,
  title,
  ...props
}) {
  const shape = variant ?? 'circle'
  const isDark = theme === 'dark'
  const buttonRef = useRef(null)
  const isTransitioningRef = useRef(false)

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current
    if (
      !button ||
      isTransitioningRef.current ||
      document.documentElement.dataset.magicuiThemeVt === 'active'
    ) {
      return
    }

    const applyTheme = () => {
      onThemeChange?.(isDark ? 'light' : 'dark')
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || instant || typeof document.startViewTransition !== 'function') {
      flushSync(applyTheme)
      return
    }

    // innerWidth/innerHeight (not visualViewport): percentages must resolve
    // against the snapshot reference box, which includes classic scrollbars.
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x
    let y
    if (fromCenter) {
      x = viewportWidth / 2
      y = viewportHeight / 2
    } else {
      const { top, left, width, height } = button.getBoundingClientRect()
      x = left + width / 2
      y = top + height / 2
    }

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y),
    )

    const clipPath = getThemeTransitionClipPaths(
      shape,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight,
    )

    const root = document.documentElement
    root.dataset.magicuiThemeVt = 'active'
    root.style.setProperty('--magicui-theme-toggle-vt-duration', `${duration}ms`)
    // Pin collapsed clip-path so Firefox does not paint unclipped between
    // snapshot and the ready.then() JS animation.
    root.style.setProperty('--magicui-theme-vt-clip-from', clipPath[0])

    const cleanup = () => {
      isTransitioningRef.current = false
      delete root.dataset.magicuiThemeVt
      root.style.removeProperty('--magicui-theme-toggle-vt-duration')
      root.style.removeProperty('--magicui-theme-vt-clip-from')
    }

    isTransitioningRef.current = true
    const transition = document.startViewTransition(() => {
      flushSync(applyTheme)
    })

    if (typeof transition?.finished?.finally === 'function') {
      transition.finished.finally(cleanup).catch(() => {})
    } else {
      cleanup()
    }

    const ready = transition?.ready
    if (ready && typeof ready.then === 'function') {
      ready
        .then(() => {
          document.documentElement.animate(
            { clipPath },
            {
              duration,
              easing: shape === 'star' ? 'linear' : 'ease-in-out',
              fill: 'forwards',
              pseudoElement: '::view-transition-new(root)',
            },
          )
        })
        .catch(() => {})
    }
  }, [duration, fromCenter, instant, isDark, onThemeChange, shape])

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn('animated-theme-toggler', className)}
      aria-pressed={isDark}
      aria-label={ariaLabel}
      title={title}
      {...props}
    >
      <span className="animated-theme-toggler__icon">{isDark ? <SunIcon /> : <MoonIcon />}</span>
      {label ? <span className="animated-theme-toggler__label">{label}</span> : null}
    </button>
  )
}
