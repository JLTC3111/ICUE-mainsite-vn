// Adapted from React Bits Rubber Segment, checked 2026-10-30.
// https://reactbits.dev/micro/rubber-segment
// See docs/third-party/react-bits-LICENSE.md.
import { useLayoutEffect, useRef, useState } from 'react'
import './RubberSegment.css'

const SIZES = { sm: [32, 12, 10], md: [38, 13, 14], lg: [44, 14, 18] }
const clamp = (n, a, b) => Math.min(b, Math.max(a, n))
const TOGGLE_LABELS = { vi: ['Tắt', 'Bật'], en: ['Off', 'On'], de: ['Aus', 'Ein'], fr: ['Non', 'Oui'], ko: ['끄기', '켜기'], ja: ['オフ', 'オン'] }
export function toggleSegmentLabels(locale = 'en') { return TOGGLE_LABELS[String(locale).split(/[-_]/)[0]] || TOGGLE_LABELS.en }

/** Rubber thumb, with native controls kept underneath its decorative copy.
 * Strings follow the upstream API; objects can also supply id/ariaControls,
 * disabled, icon, itemProps, or href for native navigation. */
export default function RubberSegment({
  items = [], value, defaultValue, onChange, trackColor = 'var(--rs-theme-track, #27272a)',
  thumbColor = 'var(--rs-theme-thumb, #fafafa)', textColor = 'var(--rs-theme-ink, #fafafa)',
  activeTextColor = 'var(--rs-theme-active, #18181b)', size = 'md', radius = 10,
  inset = 3, equalSlots = true, stretch = 100, squash = 3, speed = 1, glide = 75,
  draggable = true, disabled = false, className = '', itemClassName = '', style,
  role = 'radiogroup', ariaLabel, 'aria-label': accessibleLabel, ...rootProps
}) {
  const list = items.map(item => typeof item === 'string' ? { value: item, label: item } : item)
  const [inner, setInner] = useState(() => defaultValue ?? list.find(item => !item.disabled)?.value)
  const current = value === undefined ? inner : value
  const index = list.findIndex(item => item.value === current)
  const trackRef = useRef(null), buttons = useRef([]), engine = useRef(null)
  const latest = useRef(null)
  latest.current = { list, current, index, onChange, disabled, draggable, stretch, squash, speed, glide, controlled: value !== undefined }
  const dimensions = SIZES[size] || SIZES.md
  const itemKey = list.map(item => `${item.value}:${item.disabled}:${typeof item.label === 'string' ? item.label : ''}`).join('|')

  useLayoutEffect(() => {
    const track = trackRef.current
    if (track?.nodeType !== 1) return undefined
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let reduced = Boolean(media?.matches), frame = 0, mounted = true
    let bounds = [], left = 0, right = 0, drag = null, suppressClick = false
    let suppressTimer, measuredValue = latest.current.current
    const paint = (l, r) => {
      left = l; right = Math.max(l, r)
      track.style.setProperty('--rs-left', `${Math.max(0, l)}px`)
      track.style.setProperty('--rs-right', `${Math.max(0, track.clientWidth - inset * 2 - right)}px`)
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0 }
    const jump = i => {
      stop()
      const slot = bounds[i]
      if (slot) paint(slot.l, slot.r)
    }
    const travel = i => {
      const slot = bounds[i]
      if (!slot) return
      stop()
      if (reduced || document.hidden) { jump(i); return }
      const a = { l: left, r: right }, started = performance.now()
      const settings = latest.current
      const amount = clamp(settings.stretch / 100, 0, 2)
      const dilation = { l: slot.l + (Math.min(a.l, slot.l) - slot.l) * amount, r: slot.r + (Math.max(a.r, slot.r) - slot.r) * amount }
      const duration = 620 / Math.max(0.2, settings.speed)
      const step = now => {
        const t = clamp((now - started) / duration, 0, 1)
        if (t < 0.24) {
          const p = 1 - Math.pow(1 - t / 0.24, 3)
          paint(a.l + (dilation.l - a.l) * p, a.r + (dilation.r - a.r) * p)
        } else {
          const p = (t - 0.24) / 0.76
          const ease = 1 - Math.pow(1 - p, 3)
          const recoil = Math.sin(p * Math.PI * 2) * Math.pow(1 - p, 2) * settings.squash
          paint(dilation.l + (slot.l - dilation.l) * ease + recoil, dilation.r + (slot.r - dilation.r) * ease - recoil)
        }
        if (t < 1) frame = requestAnimationFrame(step)
        else { paint(slot.l, slot.r); frame = 0 }
      }
      frame = requestAnimationFrame(step)
    }
    const measure = (animateSelection = false) => {
      if (!mounted) return
      if (drag) {
        if (latest.current.disabled || !latest.current.draggable || latest.current.list[latest.current.index]?.disabled || latest.current.index < 0) cancelDrag()
        else return
      }
      const rect = track.getBoundingClientRect()
      bounds = latest.current.list.map((_, i) => {
        const box = buttons.current[i]?.getBoundingClientRect()
        return box ? { l: box.left - rect.left - inset, r: box.right - rect.left - inset } : { l: 0, r: 0 }
      })
      if (animateSelection && measuredValue !== latest.current.current) travel(latest.current.index)
      else jump(latest.current.index)
      measuredValue = latest.current.current
    }
    const cancelDrag = () => {
      const previous = drag
      drag = null
      if (previous && track.hasPointerCapture?.(previous.id)) track.releasePointerCapture?.(previous.id)
      track.removeAttribute('data-held')
    }
    engine.current = {
      travel, measure,
      suppress(event) {
        if (!suppressClick) return false
        event.preventDefault(); event.stopPropagation(); suppressClick = false
        clearTimeout(suppressTimer)
        return true
      },
      down(event, i) {
        const state = latest.current
        if (state.disabled || !state.draggable || role === 'navigation' || event.button !== 0 || event.isPrimary === false || i !== state.index) return
        measure()
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, l: left, r: right, moved: false, time: event.timeStamp, lastX: event.clientX, velocity: 0 }
      },
      move(event) {
        if (!drag || event.pointerId !== drag.id) return
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y
        if (!drag.moved) {
          if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { cancelDrag(); return }
          if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(dy)) return
          drag.moved = true; stop()
          track.setPointerCapture?.(event.pointerId)
          track.setAttribute('data-held', '')
        }
        event.preventDefault()
        const dt = event.timeStamp - drag.time
        if (dt > 0) drag.velocity = clamp((event.clientX - drag.lastX) / dt, -2, 2)
        drag.lastX = event.clientX; drag.time = event.timeStamp
        const width = drag.r - drag.l
        const l = clamp(drag.l + dx, 0, Math.max(0, track.clientWidth - inset * 2 - width))
        paint(l, l + width)
      },
      up(event, cancelled = false) {
        if (!drag || event.pointerId !== drag.id) return
        const previous = drag
        cancelDrag()
        if (!previous.moved) return
        suppressClick = true
        clearTimeout(suppressTimer)
        suppressTimer = setTimeout(() => { suppressClick = false }, 400)
        if (cancelled) { travel(latest.current.index); return }
        const projection = (left + right) / 2 + previous.velocity * latest.current.glide
        let to = latest.current.index, distance = Infinity
        bounds.forEach((slot, i) => {
          if (latest.current.list[i].disabled) return
          const delta = Math.abs((slot.l + slot.r) / 2 - projection)
          if (delta < distance) { to = i; distance = delta }
        })
        select(to)
        buttons.current[to]?.focus({ preventScroll: true })
      },
    }
    const syncMotion = () => { reduced = Boolean(media?.matches); cancelDrag(); jump(latest.current.index) }
    const onVisibility = () => { if (document.hidden) syncMotion() }
    const onResize = () => measure()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null
    observer?.observe(track)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    media?.addEventListener?.('change', syncMotion)
    document.fonts?.ready.then(onResize)
    measure()
    return () => {
      mounted = false; stop(); clearTimeout(suppressTimer); cancelDrag(); engine.current = null
      observer?.disconnect(); window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      media?.removeEventListener?.('change', syncMotion)
    }
  }, [inset, role])

  // Localized labels, external route changes and dynamic/disabled choices all
  // remeasure the same thumb; they never keep an index from an old item list.
  useLayoutEffect(() => { engine.current?.measure(true) }, [current, itemKey, size, equalSlots, disabled])

  function select(i) {
    const settings = latest.current
    const item = settings.list[i]
    if (!item || item.disabled || settings.disabled) return
    if (!settings.controlled) setInner(item.value)
    engine.current?.travel(i)
    settings.onChange?.(item.value, i)
    if (settings.controlled) Promise.resolve().then(() => {
      if (latest.current.current !== item.value) engine.current?.travel(latest.current.index)
    })
  }
  function keydown(event, i) {
    if (disabled) return
    const enabled = list.map((item, j) => !item.disabled ? j : -1).filter(j => j >= 0)
    const at = enabled.indexOf(i)
    let next
    const rtl = trackRef.current && window.getComputedStyle(trackRef.current).direction === 'rtl'
    if (event.key === 'Home') next = enabled[0]
    else if (event.key === 'End') next = enabled.at(-1)
    else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      let direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
      if (rtl && ['ArrowRight', 'ArrowLeft'].includes(event.key)) direction *= -1
      next = enabled[(at + direction + enabled.length) % enabled.length]
    }
    if (next == null) return
    event.preventDefault(); buttons.current[next]?.focus({ preventScroll: true })
    if (role !== 'navigation') select(next)
  }
  const firstEnabled = list.findIndex(item => !item.disabled)
  const tabStop = index >= 0 && !list[index].disabled ? index : firstEnabled
  const controlRole = role === 'tablist' ? 'tab' : role === 'radiogroup' ? 'radio' : undefined
  return (
    <div {...rootProps} ref={trackRef} role={role} aria-label={accessibleLabel || ariaLabel}
      aria-disabled={disabled || undefined} data-equal={equalSlots || undefined}
      data-active={index >= 0 || undefined} data-draggable={draggable && !disabled && role !== 'navigation' || undefined}
      className={`rubber-segment ${className}`.trim()}
      style={{ '--rs-track': trackColor, '--rs-thumb': thumbColor, '--rs-ink': textColor, '--rs-ink-active': activeTextColor,
        '--rs-radius': `${radius}px`, '--rs-inset': `${inset}px`, '--rs-thumb-radius': `${Math.max(0, radius - inset)}px`,
        '--rs-h': `${dimensions[0]}px`, '--rs-font': `${dimensions[1]}px`, '--rs-pad': `${dimensions[2]}px`, ...style }}
      onPointerMove={event => engine.current?.move(event)} onPointerUp={event => engine.current?.up(event)}
      onPointerCancel={event => engine.current?.up(event, true)} onLostPointerCapture={event => engine.current?.up(event, true)}>
      {list.map((item, i) => {
        const active = i === index, isDisabled = disabled || item.disabled
        const Tag = item.href ? 'a' : 'button'
        return <Tag {...item.itemProps} key={item.value} ref={node => { buttons.current[i] = node }}
          type={item.href ? undefined : 'button'} href={isDisabled ? undefined : item.href} target={item.target} rel={item.rel}
          id={item.id} role={controlRole} aria-controls={item.ariaControls}
          aria-checked={role === 'radiogroup' ? active : undefined} aria-selected={role === 'tablist' ? active : undefined}
          aria-pressed={role === 'group' ? active : undefined} aria-current={role === 'navigation' && active ? 'page' : undefined}
          aria-disabled={item.href && isDisabled || undefined} disabled={item.href ? undefined : isDisabled}
          tabIndex={isDisabled ? -1 : role === 'navigation' || role === 'group' || i === tabStop ? 0 : -1}
          className={`rubber-segment__item ${itemClassName} ${item.className || ''}`.trim()}
          onKeyDown={event => keydown(event, i)} onPointerDown={event => engine.current?.down(event, i)}
          onClick={(event = {}) => {
            if (engine.current?.suppress(event)) return
            if (isDisabled) { event.preventDefault(); return }
            item.itemProps?.onClick?.(event)
            if (event.defaultPrevented) return
            if (item.href && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return
            select(i)
          }}>{item.icon}{item.label}</Tag>
      })}
      <div className="rubber-segment__thumb" aria-hidden="true">
        {list.map(item => <span key={item.value} className="rubber-segment__item rubber-segment__copy">{item.icon}{item.label}</span>)}
      </div>
    </div>
  )
}
