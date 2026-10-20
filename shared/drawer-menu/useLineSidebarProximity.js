import { useCallback, useEffect, useRef } from 'react'

// React Bits Line Sidebar's configurable falloff; preserve real route links.
const FALLOFF = { linear: p => p, smooth: p => p * p * (3 - 2 * p), sharp: p => p ** 3 }

export function useLineSidebarProximity({ enabled = true, deps = [], proximityRadius = 110, smoothing = 100, falloff = 'smooth' } = {}) {
  const navRef = useRef(null)
  const rafRef = useRef(null)
  const lastRef = useRef(0)
  const fxRef = useRef({ els: [], targets: [], current: [] })
  const options = useRef({ enabled, smoothing })
  options.current = { enabled, smoothing }

  const runFrame = useCallback((now) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05)
    lastRef.current = now
    if (!options.current.enabled) { rafRef.current = null; return }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const k = reduced || options.current.smoothing <= 0 ? 1 : 1 - Math.exp(-dt / (options.current.smoothing / 1000))

    const { els, targets, current } = fxRef.current
    let moving = false
    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      if (!el) continue
      const pinned = el.classList.contains('is-current') ? 1 : 0
      const target = targets[i] || 0
      const cur = current[i] || 0
      const next = cur + (target - cur) * k
      const settled = Math.abs(target - next) < 0.0015
      const value = settled ? target : next
      current[i] = value
      el.style.setProperty('--effect', value.toFixed(4))
      el.style.setProperty('--active', pinned ? '1' : '0')
      if (!settled) moving = true
    }

    const nav = navRef.current
    if (nav) {
      nav.querySelectorAll('.nav-drawer__submenu-toggle').forEach((toggle) => {
        const row = toggle.nextElementSibling
        if (row?.classList?.contains('nav-drawer__submenu-row')) {
          row.style.setProperty('--effect', toggle.style.getPropertyValue('--effect') || '0')
        }
      })
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
      if (!enabled || !nav || e.pointerType === 'touch') return
      const els = collectItems()
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        // Submenus have a different offsetParent. Viewport coordinates keep
        // their highlight aligned with the pointer when expanded or scrolled.
        const rect = el.getBoundingClientRect()
        const distance = Math.abs(e.clientY - rect.top - rect.height / 2)
        fxRef.current.targets[i] = (FALLOFF[falloff] || FALLOFF.smooth)(Math.max(0, 1 - distance / Math.max(1, proximityRadius)))
      }
      startLoop()
    },
    [enabled, collectItems, startLoop, falloff, proximityRadius],
  )

  const handlePointerLeave = useCallback(() => {
    fxRef.current.targets = fxRef.current.targets.map(() => 0)
    startLoop()
  }, [startLoop])

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      fxRef.current.targets = []
      fxRef.current.current = []
      return
    }
    const els = collectItems()
    fxRef.current.targets = els.map(() => 0)
    fxRef.current.current = els.map(() => 0)
    els.forEach((el) => {
      el.style.setProperty('--effect', '0')
      el.style.setProperty('--active', el.classList.contains('is-current') ? '1' : '0')
    })
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
