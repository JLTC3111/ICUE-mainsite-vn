// Adapted from React Bits Pulse Heart (JavaScript + CSS), checked 2026-11-02.
// https://reactbits.dev/micro/pulse-heart — David Haz and contributors.
// See docs/third-party/react-bits-LICENSE.md.
// Controlled reaction state stays with the caller; the existing Phosphor icons
// replace the upstream icon package. Only explicit pointer presses animate.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './PulseHeart.css'

const FLIP = 0.4
const back = (progress, overshoot) => {
  const value = progress - 1
  return 1 + (overshoot + 1) * value ** 3 + overshoot * value ** 2
}
const swell = (progress, overshoot) => progress <= 0 ? 0 : progress < FLIP
  ? 1 - (1 - progress / FLIP) ** 3
  : 1 - back((progress - FLIP) / (1 - FLIP), overshoot)
const reduceMotion = () => typeof window !== 'undefined'
  && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
const readClock = () => performance.now()

function formatterFor(locale) {
  try { return new Intl.NumberFormat(locale) } catch { return new Intl.NumberFormat() }
}

function numberCells(text, roll) {
  if (!roll) return [...text].map(char => ({ char }))
  const { from, to, up } = roll
  const changed = from.length === to.length ? [...to].flatMap((char, index) => char !== from[index] ? [index] : []) : []
  if (changed.length !== 1) return [{ top: up ? from : to, bottom: up ? to : from }]
  return [...to].map((char, index) => index === changed[0]
    ? { top: up ? from[index] : char, bottom: up ? char : from[index] }
    : { char })
}

export default function PulseHeart({
  liked = false, count = 0, onChange, icon, disabled = false, busy = false,
  label = 'Like', title = label, locale, className = '',
  duration = 560, dotSize = 0.3, overshoot = 1.7, beat = 3, rollDuration = 350,
}) {
  const [runState, setRunState] = useState(null)
  const [roll, setRoll] = useState(null)
  const rootRef = useRef(null)
  const pillRef = useRef(null)
  const iconRef = useRef(null)
  const rollRef = useRef(null)
  const frameRef = useRef(0)
  const timerRef = useRef(0)
  const pointerRef = useRef(false)
  const format = formatterFor(locale)
  const total = Math.max(0, Math.trunc(Number(count) || 0))
  const shown = runState ? (runState.flipped ? runState.to : runState.from) : { liked, count: total }

  const stop = useCallback((settle = true) => {
    cancelAnimationFrame(frameRef.current)
    clearTimeout(timerRef.current)
    frameRef.current = 0
    timerRef.current = 0
    if (iconRef.current) iconRef.current.style.transform = ''
    if (pillRef.current) pillRef.current.style.transform = ''
    if (rootRef.current) {
      delete rootRef.current.dataset.running
      delete rootRef.current.dataset.pressed
    }
    if (settle) { setRunState(null); setRoll(null) }
  }, [])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const changed = () => { if (media?.matches) stop() }
    media?.addEventListener?.('change', changed)
    return () => { media?.removeEventListener?.('change', changed); stop(false) }
  }, [stop])

  useLayoutEffect(() => {
    const element = rollRef.current
    if (!element || !roll) return
    element.style.transition = 'none'
    element.style.transform = `translateY(${roll.up ? '0' : '-1em'})`
    element.getBoundingClientRect()
    element.style.transition = ''
    element.style.transform = `translateY(${roll.up ? '-1em' : '0'})`
  }, [roll])

  const run = (nextLiked, nextCount) => {
    const root = rootRef.current, glyph = iconRef.current, pill = pillRef.current
    if (!root || !glyph || !pill) return
    const from = { liked, count: total }, to = { liked: nextLiked, count: nextCount }
    setRunState({ from, to, flipped: false })
    root.dataset.running = ''
    const started = readClock()
    const length = Math.max(1, duration)
    let flipped = false, previous = 0
    const tick = now => {
      const progress = Math.min(1, Math.max(0, (now - started) / length))
      const step = previous ? now - previous : 1000 / 60
      previous = now
      const amount = swell(progress, overshoot)
      glyph.style.transform = `scale(${1 - (1 - dotSize) * amount})`
      pill.style.transform = `scale(${1 - (beat / 100) * amount})`
      if (!flipped && progress + step / 2 / length >= FLIP) {
        flipped = true
        setRunState({ from, to, flipped: true })
        if (from.count !== to.count) {
          setRoll({ from: format.format(from.count), to: format.format(to.count), up: to.count > from.count })
          timerRef.current = setTimeout(() => { timerRef.current = 0; setRoll(null) }, rollDuration)
        }
      }
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
      else stop()
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const release = () => { if (rootRef.current) delete rootRef.current.dataset.pressed }
  const handleClick = event => {
    if (disabled || frameRef.current) return
    const pointer = pointerRef.current && event.detail !== 0
    pointerRef.current = false
    release()
    const nextLiked = !liked, nextCount = Math.max(0, total + (nextLiked ? 1 : -1))
    if (pointer && !reduceMotion()) run(nextLiked, nextCount)
    onChange?.(nextLiked, nextCount)
  }

  return (
    <button ref={rootRef} type="button" className={`pulse-heart ${className}`.trim()}
      aria-pressed={liked} aria-busy={busy || undefined} aria-label={`${label}, ${format.format(total)}`}
      title={title} disabled={disabled} data-liked={String(shown.liked)}
      style={{ '--ph-roll': `${rollDuration}ms` }}
      onPointerDown={event => {
        if (disabled || event.button !== 0) return
        pointerRef.current = true
        if (!reduceMotion() && rootRef.current) rootRef.current.dataset.pressed = ''
      }}
      onPointerUp={release} onPointerLeave={release}
      onPointerCancel={() => { pointerRef.current = false; release() }}
      onKeyDown={() => { pointerRef.current = false }} onClick={handleClick}>
      <span ref={pillRef} className="pulse-heart__pill">
        <span ref={iconRef} className="pulse-heart__heart" aria-hidden="true">{icon?.(shown.liked)}</span>
        <span className="pulse-heart__count" aria-hidden="true">
          {numberCells(format.format(shown.count), runState ? roll : null).map((cell, index) => 'char' in cell
            ? <span key={`c${index}`}>{cell.char}</span>
            : <span key={`r${index}`} className="pulse-heart__slot"><span ref={rollRef} className="pulse-heart__roll"><span>{cell.top}</span><span>{cell.bottom}</span></span></span>)}
        </span>
      </span>
    </button>
  )
}
