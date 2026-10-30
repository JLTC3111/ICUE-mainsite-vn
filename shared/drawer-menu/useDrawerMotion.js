import { useEffect, useState } from 'react'

const SPIN_MS = 180
const SLIDE_MS = 450
const FADE_MS = 160
const CLOSE_MS = SPIN_MS + SLIDE_MS

// All three header variants use the same clock for their panel and X icon.
export const DRAWER_MOTION_STYLE = {
  '--drawer-spin-duration': `${SPIN_MS}ms`,
  '--drawer-slide-duration': `${SLIDE_MS}ms`,
  '--drawer-close-duration': `${CLOSE_MS}ms`,
  '--drawer-fade-duration': `${FADE_MS}ms`,
  '--drawer-fade-delay': `${CLOSE_MS - FADE_MS}ms`,
}

export default function useDrawerMotion(open) {
  const [present, setPresent] = useState(open)
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (open) {
      setPresent(true)
      return undefined
    }
    if (!present) return undefined
    if (reducedMotion) {
      setPresent(false)
      return undefined
    }

    // The panel's transitionend normally releases the foreground. A bounded
    // fallback also handles background tabs or a browser dropping that event.
    const timer = window.setTimeout(() => setPresent(false), CLOSE_MS + 100)
    return () => window.clearTimeout(timer)
  }, [open, present, reducedMotion])

  const closing = !open && present && !reducedMotion
  const onTransitionEnd = event => {
    if (closing && event.propertyName === 'transform'
      && event.target.classList.contains('nav-drawer')) setPresent(false)
  }
  return { closing, visible: open || closing, onTransitionEnd }
}
