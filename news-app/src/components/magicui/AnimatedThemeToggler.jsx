import { useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import './AnimatedThemeToggler.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function polygonCollapsed(point, vertexCount) {
  const pairs = Array.from({ length: vertexCount }, () => point).join(', ')
  return `polygon(${pairs})`
}

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
  const toRadius = (r) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`

  switch (variant) {
    case 'circle':
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
  }
}

export default function AnimatedThemeToggler({
  className = '',
  duration = 320,
  variant = 'circle',
  fromCenter = false,
  theme = 'light',
  onThemeChange,
  'aria-label': ariaLabel,
  title,
  ...props
}) {
  const isDark = theme === 'dark'
  const buttonRef = useRef(null)
  const isTransitioningRef = useRef(false)

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current
    if (
      !button
      || isTransitioningRef.current
      || document.documentElement.dataset.magicuiThemeVt === 'active'
    ) {
      return
    }

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

    const applyTheme = () => {
      onThemeChange?.(isDark ? 'light' : 'dark')
    }

    if (typeof document.startViewTransition !== 'function') {
      applyTheme()
      return
    }

    const clipPath = getThemeTransitionClipPaths(
      variant,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight,
    )

    const root = document.documentElement
    root.dataset.magicuiThemeVt = 'active'
    root.style.setProperty('--magicui-theme-toggle-vt-duration', `${duration}ms`)
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
              easing: 'ease-in-out',
              fill: 'forwards',
              pseudoElement: '::view-transition-new(root)',
            },
          )
        })
        .catch(() => {})
    }
  }, [duration, fromCenter, isDark, onThemeChange, variant])

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
      <span className="animated-theme-toggler__icon" aria-hidden="true">
        {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
      </span>
    </button>
  )
}
