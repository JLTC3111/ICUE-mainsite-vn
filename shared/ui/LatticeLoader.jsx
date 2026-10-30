// Adapted from React Bits Lattice Loader (JavaScript + CSS), checked 2026-10-30.
// https://reactbits.dev/micro/lattice-loader — David Haz and contributors.
// See docs/third-party/react-bits-LICENSE.md.

import { useEffect, useLayoutEffect, useRef } from 'react'
import './LatticeLoader.css'

const PATTERNS = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
    4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 },
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 },
  },
  sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } },
}
const DEFAULT_PATTERN = { 3: 'orbit', 4: 'sweep' }
const MARKS = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] },
}
const LOADING_LABELS = {
  vi: 'Đang tải…', en: 'Loading…', de: 'Wird geladen…',
  fr: 'Chargement…', ko: '불러오는 중…', ja: '読み込み中…',
}

export function loadingLabelForLocale(locale) {
  return LOADING_LABELS[String(locale || 'en').toLowerCase().split(/[-_]/)[0]] || LOADING_LABELS.en
}

const readClock = () => typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now()

function resolvePattern(pattern, grid) {
  if (typeof pattern !== 'object' || !Array.isArray(pattern?.cells)) {
    return PATTERNS[pattern]?.[grid] || PATTERNS[DEFAULT_PATTERN[grid]][grid]
  }
  const cells = Array.from({ length: grid * grid }, (_, index) => pattern.cells[index] ?? null)
  return {
    cells,
    loop: pattern.loop ?? Math.max(0, ...cells.filter(value => value != null)) + 4.2,
    scale: pattern.scale ?? 1,
    lit: pattern.lit ?? 0.62,
  }
}

function formatElapsed(milliseconds) {
  const tenths = Math.floor(Math.max(0, milliseconds) / 100)
  return tenths < 600
    ? `${(tenths / 10).toFixed(1)}s`
    : `${Math.floor(tenths / 600)}m ${((tenths % 600) / 10).toFixed(1)}s`
}

/** A localized status label, a small lattice and an optional visual stopwatch.
 * Inline rendering remains valid inside buttons, links, paragraphs and tables. */
export default function LatticeLoader({
  label,
  children,
  doneLabel = 'Done',
  errorLabel = 'Failed',
  status = 'working',
  pattern = 'orbit',
  grid = 3,
  shape = 'round',
  color = 'currentColor',
  doneColor = 'currentColor',
  errorColor = 'currentColor',
  cellSize,
  gap = 2,
  fontSize,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = '',
  showTimer = true,
  elapsed,
  compact = false,
  inline = false,
  announce = true,
  className = '',
  style,
}) {
  const rootRef = useRef(null)
  const timerRef = useRef(null)
  const clockRef = useRef({ status: null, external: false, startedAt: 0, milliseconds: 0 })
  const n = grid === 4 ? 4 : 3
  const state = status === 'done' || status === 'error' ? status : 'working'
  const pat = resolvePattern(pattern, n)
  const duration = step * pat.scale
  const loadingLabel = label ?? loadingLabelForLocale(typeof document === 'undefined' ? 'en' : document.documentElement?.lang)
  const currentLabel = state === 'working' ? children ?? loadingLabel : state === 'done' ? doneLabel : errorLabel
  const externalElapsed = typeof elapsed === 'number' && Number.isFinite(elapsed) ? Math.max(0, elapsed) : null

  const paint = () => {
    const clock = clockRef.current
    const milliseconds = clock.external || clock.status !== 'working'
      ? clock.milliseconds
      : readClock() - clock.startedAt
    if (timerRef.current) timerRef.current.textContent = formatElapsed(milliseconds)
  }

  useLayoutEffect(() => {
    if (rootRef.current?.nodeType !== 1) return
    const clock = clockRef.current
    const now = readClock()
    if (externalElapsed != null) clock.milliseconds = externalElapsed * 1000
    else if (state === 'working') {
      if (clock.status !== 'working' || clock.external) {
        clock.startedAt = now
        clock.milliseconds = 0
      }
    } else if (clock.status === 'working' && !clock.external) {
      clock.milliseconds = now - clock.startedAt
    }
    clock.status = state
    clock.external = externalElapsed != null
    paint()
  }, [state, externalElapsed, showTimer])

  useEffect(() => {
    const root = rootRef.current
    if (root?.nodeType !== 1) return undefined
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let visible = !document.hidden
    let intersecting = true
    let interval

    const sync = () => {
      clearInterval(interval)
      interval = undefined
      const active = visible && intersecting
      root.toggleAttribute('data-paused', !active)
      paint()
      if (active && state === 'working' && externalElapsed == null && showTimer) {
        // Time is measured against a monotonic clock, including hidden time.
        // Reduced motion keeps the lattice still and updates time once a second.
        interval = setInterval(paint, motion?.matches ? 1000 : 100)
      }
    }
    const onVisibility = () => { visible = !document.hidden; sync() }
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === root)
        if (entry) { intersecting = entry.isIntersecting; sync() }
      })
      : null
    observer?.observe(root)
    document.addEventListener('visibilitychange', onVisibility)
    motion?.addEventListener?.('change', sync)
    sync()
    return () => {
      clearInterval(interval)
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      motion?.removeEventListener?.('change', sync)
    }
  }, [state, externalElapsed, showTimer])

  return (
    <span
      ref={rootRef}
      role={announce ? 'status' : undefined}
      aria-live={announce ? 'polite' : undefined}
      aria-atomic={announce ? 'true' : undefined}
      className={`lattice-loader${compact ? ' lattice-loader--compact' : ''}${inline ? ' lattice-loader--inline' : ''}${className ? ` ${className}` : ''}`}
      data-status={state}
      data-shape={shape}
      data-glow={glow ? '' : undefined}
      style={{
        '--ll-n': n,
        '--ll-cell': `${cellSize ?? (compact ? 4 : 6)}px`,
        '--ll-gap': `${gap}px`,
        '--ll-font': fontSize == null ? '1em' : `${fontSize}px`,
        '--ll-color': color,
        '--ll-mark': state === 'error' ? errorColor : doneColor,
        '--ll-idle': idleOpacity,
        '--ll-glow': glowColor || color,
        '--ll-mark-glow': glowColor || (state === 'error' ? errorColor : doneColor),
        '--ll-cycle': `${Math.round(pat.loop * duration)}ms`,
        ...style,
      }}
    >
      <span className="lattice-loader__grid" aria-hidden="true">
        <span className="lattice-loader__layer lattice-loader__run">
          {pat.cells.map((unit, index) => (
            <span
              key={index}
              className="lattice-loader__cell"
              data-hole={unit == null ? '' : undefined}
              data-lit={pat.lit && pat.lit !== 0.62 ? Math.round(pat.lit * 100) : undefined}
              style={unit == null ? undefined : { animationDelay: `${Math.round(unit * duration)}ms` }}
            />
          ))}
        </span>
        <span className="lattice-loader__layer lattice-loader__mark">
          {pat.cells.map((_, index) => (
            <span key={index} className="lattice-loader__cell" data-on={MARKS[n][state === 'error' ? 'error' : 'done'].includes(index) ? '' : undefined} />
          ))}
        </span>
      </span>
      <span className="lattice-loader__label">{currentLabel}</span>
      {showTimer && <span ref={timerRef} className="lattice-loader__timer" aria-hidden="true">{formatElapsed((externalElapsed ?? 0) * 1000)}</span>}
    </span>
  )
}
