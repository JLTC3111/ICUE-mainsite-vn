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

function readPreference(storageKey, compact = isCompactViewport()) {
  const key = compact ? `${storageKey}:compact` : storageKey
  return { key, compact, mode: readMode(key) }
}

/** Desktop and compact screens remember independent choices across the apps. */
export default function useFloatingCollapse({ storageKey, keepOpen = false }) {
  const [preference, setPreference] = useState(() => readPreference(storageKey))
  const { key, compact, mode } = preference
  const [autoCollapsed, setAutoCollapsed] = useState(isCompactViewport)
  const [engaged, setEngaged] = useState(false)
  const interactionRef = useRef({ pointer: false, focus: false })
  const visitModes = useRef(new Map())
  const collapsed = !keepOpen && (mode === 'collapsed' || (mode === 'auto' && autoCollapsed))

  const selectMode = useCallback(next => {
    if (next === 'auto') setAutoCollapsed(compact)
    visitModes.current.set(key, next)
    setPreference(previous => ({ ...previous, mode: next }))
    try { localStorage.setItem(key, next) } catch { /* The control still works without storage. */ }
  }, [compact, key])

  const interact = useCallback((kind, value) => {
    interactionRef.current[kind] = value
    const active = interactionRef.current.pointer || interactionRef.current.focus
    setEngaged(active)
  }, [])

  useEffect(() => {
    const media = window.matchMedia?.(COMPACT_VIEWPORT)
    const resize = () => {
      const nextCompact = Boolean(media?.matches)
      const nextKey = nextCompact ? `${storageKey}:compact` : storageKey
      setPreference(previous => {
        if (previous.key === nextKey) return previous
        const next = readPreference(storageKey, nextCompact)
        return { ...next, mode: visitModes.current.get(nextKey) ?? next.mode }
      })
      setAutoCollapsed(nextCompact)
    }
    resize()
    media?.addEventListener?.('change', resize)
    return () => media?.removeEventListener?.('change', resize)
  }, [storageKey])

  useEffect(() => {
    if (mode !== 'auto' || keepOpen || engaged) return undefined
    let timer
    const clear = () => window.clearTimeout(timer)
    const schedule = () => {
      clear()
      if (document.hidden) return
      if (compact) setAutoCollapsed(true)
      else timer = window.setTimeout(() => setAutoCollapsed(true), FLOATING_COLLAPSE_DELAY_MS)
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => {
      clear()
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [compact, engaged, keepOpen, mode])

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
