import { useEffect, useRef } from 'react'
import './MagicBentoEffects.css'

// Adapted from React Bits Magic Bento (2026-10-20): smoothed local light,
// proximity edges, spring transforms, canvas stars, and a grid-wide click wave.
// https://reactbits.dev/components/magic-bento
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function useBentoEffects(rootRef, options = {}) {
  const settings = useRef(options)
  settings.current = options
  const wakeRef = useRef(null)
  useEffect(() => { wakeRef.current?.() })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia?.('(hover: none) and (pointer: coarse)')
    let cards = [], bounds, dirty = true, visible = true, raf = 0, last = 0, alive = true
    const pointer = { x: 0, y: 0, active: false, down: null }
    const light = { x: 0, y: 0, ready: false }
    const wave = { age: -1, x: 0, y: 0, reach: 0 }
    const states = new WeakMap()
    let focus = null
    const disabled = () => settings.current.disableAnimations || media?.matches || coarse?.matches
    const stateFor = card => {
      if (!states.has(card)) states.set(card, { hot: 0, near: 0, rx: 0, ry: 0, tx: 0, ty: 0, stars: [], ctx: null })
      return states.get(card)
    }

    const measure = () => {
      cards = Array.from(root.querySelectorAll('.icue-bento-card'))
      bounds = root.getBoundingClientRect()
      for (const card of cards) {
        const state = stateFor(card)
        state.rect = card.getBoundingClientRect()
        const canvas = card.querySelector('.icue-bento__stars')
        if (canvas) {
          const ratio = Math.min(window.devicePixelRatio || 1, 2)
          const { width, height } = state.rect
          canvas.width = Math.max(1, Math.round(width * ratio))
          canvas.height = Math.max(1, Math.round(height * ratio))
          state.ctx = canvas.getContext('2d')
          state.ratio = ratio
          state.stars = Array.from({ length: clamp(Math.round(settings.current.particleCount ?? 12), 0, 120) }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            speed: 4 + Math.random() * 9, size: 0.5 + Math.random(), phase: Math.random() * Math.PI * 2,
          }))
        }
      }
      dirty = false
    }

    const reset = () => {
      for (const card of cards) {
        const state = stateFor(card)
        state.hot = state.near = state.rx = state.ry = state.tx = state.ty = 0
        for (const [key, value] of Object.entries({ '--mb-hot': '0', '--glow-intensity': '0', '--mb-wave-alpha': '0', '--mb-rx': '0deg', '--mb-ry': '0deg', '--mb-tx': '0px', '--mb-ty': '0px', '--mb-press': '1' })) card.style.setProperty(key, value)
        const canvas = card.querySelector('.icue-bento__stars')
        if (canvas) state.ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    const frame = now => {
      raf = 0
      if (!alive || !visible || document.hidden) return
      if (dirty) measure()
      if (disabled()) { reset(); return }
      const s = settings.current
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      let busy = false
      const radius = Math.max(40, s.spotlightRadius ?? 300)
      if (!light.ready) { light.x = pointer.x; light.y = pointer.y; light.ready = true }
      const follow = 1 - Math.exp(-dt / 0.05)
      light.x += (pointer.x - light.x) * follow
      light.y += (pointer.y - light.y) * follow
      if (pointer.active && Math.abs(light.x - pointer.x) + Math.abs(light.y - pointer.y) > 0.3) busy = true
      let waveRadius = 0, waveAlpha = 0
      if (wave.age >= 0) {
        wave.age += dt
        const progress = Math.min(1, wave.age / 0.85)
        waveRadius = wave.reach * (1 - (1 - progress) ** 2.2)
        waveAlpha = (1 - progress) ** 1.3
        if (progress === 1) wave.age = -1
        else busy = true
      }

      for (const card of cards) {
        const state = stateFor(card)
        const rect = state.rect
        if (!rect.width || !rect.height) continue
        const focused = focus && card.contains(focus)
        const targetRect = focused ? focus.getBoundingClientRect() : null
        const px = focused ? targetRect.left + targetRect.width / 2 : light.x
        const py = focused ? targetRect.top + targetRect.height / 2 : light.y
        const x = px - rect.left, y = py - rect.top
        const gap = Math.hypot(Math.max(0, -x, x - rect.width), Math.max(0, -y, y - rect.height))
        const inside = focused || (pointer.active && gap === 0)
        const nearTarget = s.enableBorderGlow === false || (!pointer.active && !focused) ? 0 : clamp(1 - gap / (radius * 0.75), 0, 1) ** 2
        const hotTarget = inside && s.enableSpotlight !== false ? 1 : 0
        const approach = (key, target, tau = 0.12) => {
          const next = state[key] + (target - state[key]) * (1 - Math.exp(-dt / tau))
          state[key] = Math.abs(next - target) < 0.002 ? target : next
          if (state[key] !== target) busy = true
        }
        approach('near', nearTarget)
        approach('hot', hotTarget, hotTarget ? 0.14 : 0.32)
        const u = clamp(x / rect.width, 0, 1) - 0.5, v = clamp(y / rect.height, 0, 1) - 0.5
        approach('rx', inside && s.enableTilt ? -v * 12 : 0)
        approach('ry', inside && s.enableTilt ? u * 12 : 0)
        approach('tx', inside && s.enableMagnetism ? u * 12 : 0)
        approach('ty', inside && s.enableMagnetism ? v * 12 : 0)
        const properties = {
          '--mb-x': `${x.toFixed(1)}px`, '--mb-y': `${y.toFixed(1)}px`, '--mb-hot': state.hot.toFixed(3),
          '--glow-x': `${(x / rect.width * 100).toFixed(2)}%`, '--glow-y': `${(y / rect.height * 100).toFixed(2)}%`,
          '--glow-intensity': state.near.toFixed(3), '--glow-radius': `${radius}px`,
          '--mb-rx': `${state.rx.toFixed(3)}deg`, '--mb-ry': `${state.ry.toFixed(3)}deg`,
          '--mb-tx': `${state.tx.toFixed(2)}px`, '--mb-ty': `${state.ty.toFixed(2)}px`,
          '--mb-press': pointer.down === card && s.clickEffect !== false ? '0.985' : '1',
          '--mb-wave-x': `${(wave.x - rect.left).toFixed(1)}px`, '--mb-wave-y': `${(wave.y - rect.top).toFixed(1)}px`,
          '--mb-wave-radius': `${waveRadius.toFixed(1)}px`, '--mb-wave-alpha': waveAlpha.toFixed(3),
        }
        for (const [key, value] of Object.entries(properties)) if (card.style.getPropertyValue(key) !== value) card.style.setProperty(key, value)
        const ctx = state.ctx
        if (ctx) {
          ctx.setTransform(state.ratio, 0, 0, state.ratio, 0, 0)
          ctx.clearRect(0, 0, rect.width, rect.height)
          if (s.enableStars && state.hot > 0.002) {
            busy = true
            const color = s.glowColor || '54, 138, 223'
            for (const particle of state.stars) {
              particle.y -= particle.speed * dt
              if (particle.y < -4) particle.y = rect.height + 4
              const distance = Math.hypot(particle.x - x, particle.y - y) / radius
              if (distance >= 1) continue
              ctx.fillStyle = `rgba(${color}, ${(state.hot * (1 - distance) ** 2 * (0.55 + 0.45 * Math.sin(now * 0.002 + particle.phase))).toFixed(3)})`
              ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill()
            }
          }
        }
      }
      if (busy) raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (raf || !alive || !visible || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    wakeRef.current = wake
    const invalidate = () => { dirty = true; wake() }
    const onMove = event => {
      if (event.pointerType === 'touch') return
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true; wake()
    }
    const onLeave = () => { pointer.active = false; pointer.down = null; wake() }
    const findCard = target => target?.closest?.('.icue-bento-card')
    const onDown = event => {
      if (event.button > 0 || event.target?.closest?.('button, a, input, textarea, select, [contenteditable]')) return
      pointer.down = findCard(event.target); wake()
    }
    const onUp = () => { pointer.down = null; wake() }
    const onClick = event => {
      if (settings.current.clickEffect === false || disabled() || !findCard(event.target)) return
      const card = findCard(event.target)
      const rect = card.getBoundingClientRect()
      wave.x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX
      wave.y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY
      wave.reach = Math.max(...[[bounds.left, bounds.top], [bounds.right, bounds.top], [bounds.left, bounds.bottom], [bounds.right, bounds.bottom]].map(([x, y]) => Math.hypot(wave.x - x, wave.y - y))) + 140
      wave.age = 0; wake()
    }
    const onFocus = event => { if (event.target.matches?.(':focus-visible')) { focus = event.target; wake() } }
    const onBlur = event => { focus = root.contains(event.relatedTarget) ? event.relatedTarget : null; wake() }
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; pointer.active = false }
      else invalidate()
    }
    const onPreference = () => { if (dirty) measure(); if (disabled()) { cancelAnimationFrame(raf); raf = 0; reset() } else wake() }
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(invalidate)
    resize?.observe(root)
    const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(invalidate)
    mutation?.observe(root, { childList: true })
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      if (visible) invalidate()
      else { cancelAnimationFrame(raf); raf = 0 }
    })
    intersection?.observe(root)
    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('click', onClick)
    root.addEventListener('focusin', onFocus)
    root.addEventListener('focusout', onBlur)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onLeave)
    window.addEventListener('resize', invalidate)
    window.addEventListener('scroll', invalidate, { capture: true, passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    media?.addEventListener('change', onPreference)
    coarse?.addEventListener('change', onPreference)
    measure(); wake()
    return () => {
      alive = false; cancelAnimationFrame(raf); reset(); wakeRef.current = null
      resize?.disconnect(); mutation?.disconnect(); intersection?.disconnect()
      root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('pointerdown', onDown); root.removeEventListener('click', onClick)
      root.removeEventListener('focusin', onFocus); root.removeEventListener('focusout', onBlur)
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onLeave); window.removeEventListener('resize', invalidate)
      window.removeEventListener('scroll', invalidate, true); document.removeEventListener('visibilitychange', onVisibility)
      media?.removeEventListener('change', onPreference); coarse?.removeEventListener('change', onPreference)
    }
  }, [rootRef])
}
