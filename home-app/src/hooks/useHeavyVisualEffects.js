import { useEffect, useState } from 'react'
import { debugLog } from '../lib/debugLog'

/** @returns {'full' | 'light' | 'none'} */
export function getVisualEffectsTier() {
  if (typeof window === 'undefined') return 'none'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'none'
  if (window.matchMedia('(max-width: 768px)').matches) return 'light'
  if (window.matchMedia('(pointer: coarse)').matches) return 'light'
  return 'full'
}

export function useVisualEffectsTier() {
  const [tier, setTier] = useState(getVisualEffectsTier)

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(max-width: 768px)'),
      window.matchMedia('(pointer: coarse)'),
    ]

    const update = () => {
      const next = getVisualEffectsTier()
      setTier(next)
      // #region agent log
      debugLog('useHeavyVisualEffects.js:update', 'visual effects tier', {
        tier: next,
        width: window.innerWidth,
        coarse: window.matchMedia('(pointer: coarse)').matches,
      }, 'C')
      // #endregion
    }

    update()
    queries.forEach((query) => query.addEventListener('change', update))
    return () => queries.forEach((query) => query.removeEventListener('change', update))
  }, [])

  return tier
}

/** Desktop mouse/trackpad layout: wide viewport and a fine pointer. */
export function isDesktopFinePointer() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(max-width: 1024px)').matches) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  return true
}

export function useDesktopFinePointer() {
  const [matches, setMatches] = useState(isDesktopFinePointer)

  useEffect(() => {
    const queries = [
      window.matchMedia('(max-width: 1024px)'),
      window.matchMedia('(pointer: coarse)'),
    ]
    const update = () => setMatches(isDesktopFinePointer())
    update()
    queries.forEach((query) => query.addEventListener('change', update))
    return () => queries.forEach((query) => query.removeEventListener('change', update))
  }, [])

  return matches
}

/**
 * Scroll Expand is a mouse-wheel scrub: extra track height plus a sticky
 * 100vh stage. Tablets and phones need ordinary document scroll (and the
 * gallery already handles swipe), so this is desktop-fine-pointer only.
 */
export function canUseScrollExpand() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return isDesktopFinePointer()
}

export function useDesktopScrollExpand() {
  const [enabled, setEnabled] = useState(canUseScrollExpand)

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(max-width: 1024px)'),
      window.matchMedia('(pointer: coarse)'),
    ]
    const update = () => setEnabled(canUseScrollExpand())
    update()
    queries.forEach((query) => query.addEventListener('change', update))
    return () => queries.forEach((query) => query.removeEventListener('change', update))
  }, [])

  return enabled
}

/** @deprecated use useVisualEffectsTier */
export function useHeavyVisualEffects() {
  const tier = useVisualEffectsTier()
  return tier === 'full'
}
