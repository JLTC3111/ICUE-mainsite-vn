import { useCallback, useEffect, useRef, useState } from 'react'

export const FLOATING_COLLAPSE_DELAY_MS = 12_000
const COMPACT_VIEWPORT = '(max-width: 768px), (max-height: 560px)'
const MODES = ['auto', 'expanded', 'collapsed']

function readMode(storageKey) {
  try {
    const value = localStorage.getItem(storageKey)
    if (MODES.includes(value)) return value
  } catch { /* Private browsing can make storage unavailable. */ }
  return 'auto'
}

function isCompactViewport() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.(COMPACT_VIEWPORT).matches)
}

/** Each floating widget remembers its own preference across the site's apps. */
export default function useFloatingCollapse({ storageKey, keepOpen = false }) {
  const [mode, setMode] = useState(() => readMode(storageKey))
  const [autoCollapsed, setAutoCollapsed] = useState(isCompactViewport)
  const [engaged, setEngaged] = useState(false)
  const interactionRef = useRef({ pointer: false, focus: false })
  const collapsed = !keepOpen && (mode === 'collapsed' || (mode === 'auto' && autoCollapsed))

  const selectMode = useCallback(next => {
    if (next === 'auto') setAutoCollapsed(isCompactViewport())
    setMode(next)
    try { localStorage.setItem(storageKey, next) } catch { /* The control still works without storage. */ }
  }, [storageKey])

  const interact = useCallback((kind, value) => {
    interactionRef.current[kind] = value
    const active = interactionRef.current.pointer || interactionRef.current.focus
    setEngaged(active)
  }, [])

  useEffect(() => {
    if (mode !== 'auto' || keepOpen || engaged) return undefined
    const media = window.matchMedia?.(COMPACT_VIEWPORT)
    let timer
    const clear = () => window.clearTimeout(timer)
    const schedule = () => {
      clear()
      if (document.hidden) return
      if (media?.matches) setAutoCollapsed(true)
      else timer = window.setTimeout(() => setAutoCollapsed(true), FLOATING_COLLAPSE_DELAY_MS)
    }
    const resize = () => {
      setAutoCollapsed(Boolean(media?.matches))
      schedule()
    }
    schedule()
    media?.addEventListener?.('change', resize)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      clear()
      media?.removeEventListener?.('change', resize)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [engaged, keepOpen, mode])

  return {
    collapsed,
    automatic: mode === 'auto',
    toggle: () => selectMode(collapsed ? 'expanded' : 'collapsed'),
    toggleAutomatic: () => selectMode(mode === 'auto' ? 'expanded' : 'auto'),
    interactionProps: {
      onPointerEnter: event => { if (event.pointerType !== 'touch') interact('pointer', true) },
      onPointerLeave: () => interact('pointer', false),
      onFocusCapture: () => interact('focus', true),
      onBlurCapture: event => {
        if (!event.currentTarget.contains(event.relatedTarget)) interact('focus', false)
      },
    },
  }
}
