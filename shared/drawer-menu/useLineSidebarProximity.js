import { useCallback, useEffect, useRef } from 'react'

const smoothstep = (p) => p * p * (3 - 2 * p)
const PROXIMITY_RADIUS = 110
const SMOOTHING_TAU = 0.1

export function useLineSidebarProximity({ enabled = true, deps = [] } = {}) {
  const navRef = useRef(null)
  const rafRef = useRef(null)
  const lastRef = useRef(0)
  const fxRef = useRef({ els: [], targets: [], current: [] })

  const runFrame = useCallback((now) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05)
    lastRef.current = now
    const k = 1 - Math.exp(-dt / SMOOTHING_TAU)

    const { els, targets, current } = fxRef.current
    let moving = false
    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      if (!el) continue
      const pinned = el.classList.contains('is-current') ? 1 : 0
      const target = Math.max(targets[i] || 0, pinned)
      const cur = current[i] || 0
      const next = cur + (target - cur) * k
      const settled = Math.abs(target - next) < 0.0015
      const value = settled ? target : next
      current[i] = value
      el.style.setProperty('--effect', value.toFixed(4))
      el.style.setProperty('--active', pinned ? '1' : '0')
      if (!settled) moving = true
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current != null) return
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(runFrame)
  }, [runFrame])

  const collectItems = useCallback(() => {
    const nav = navRef.current
    if (!nav) return []
    const els = Array.from(nav.querySelectorAll('a, .nav-drawer__submenu-toggle'))
    fxRef.current.els = els
    return els
  }, [])

  const handlePointerMove = useCallback(
    (e) => {
      const nav = navRef.current
      if (!nav) return
      const els = collectItems()
      const rect = nav.getBoundingClientRect()
      const pointerY = e.clientY - rect.top
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        const center = el.offsetTop + el.offsetHeight / 2
        const distance = Math.abs(pointerY - center)
        fxRef.current.targets[i] = smoothstep(Math.max(0, 1 - distance / PROXIMITY_RADIUS))
      }
      startLoop()
    },
    [collectItems, startLoop],
  )

  const handlePointerLeave = useCallback(() => {
    fxRef.current.targets = fxRef.current.targets.map(() => 0)
    startLoop()
  }, [startLoop])

  useEffect(() => {
    if (!enabled) {
      fxRef.current.targets = []
      return
    }
    collectItems()
    startLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, collectItems, startLoop, ...deps])

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return {
    navRef,
    handlePointerMove,
    handlePointerLeave,
    collectItems,
    startLoop,
  }
}
