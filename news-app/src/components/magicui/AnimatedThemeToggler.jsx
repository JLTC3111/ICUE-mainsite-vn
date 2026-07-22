import { useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import './AnimatedThemeToggler.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
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
  duration = 280,
  theme = 'light',
  onThemeChange,
  instant = false,
  label,
  'aria-label': ariaLabel,
  title,
  ...props
}) {
  const isDark = theme === 'dark'
  const busyRef = useRef(false)

  const toggleTheme = useCallback(() => {
    if (busyRef.current || document.documentElement.dataset.magicuiThemeVt === 'active') {
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

    const root = document.documentElement
    busyRef.current = true
    root.dataset.magicuiThemeVt = 'active'
    root.style.setProperty('--magicui-theme-toggle-vt-duration', `${duration}ms`)

    let timeoutId = 0
    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = 0
      }
      busyRef.current = false
      delete root.dataset.magicuiThemeVt
      root.style.removeProperty('--magicui-theme-toggle-vt-duration')
    }

    timeoutId = window.setTimeout(cleanup, duration + 120)

    const transition = document.startViewTransition(() => {
      flushSync(applyTheme)
    })

    if (transition?.finished) {
      transition.finished.finally(cleanup).catch(cleanup)
    } else {
      cleanup()
    }
  }, [duration, instant, isDark, onThemeChange])

  return (
    <button
      type="button"
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
