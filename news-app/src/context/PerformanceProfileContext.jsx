import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  readPerformanceOverride,
  resolveEffectiveTier,
  resolvePerformanceTier,
  storePerformanceOverride,
  storePerformanceTier,
  tierToProfile,
} from '../lib/performanceProfile'

const PerformanceProfileContext = createContext({
  ...tierToProfile('full'),
  isFullEffects: true,
  hasOverride: false,
  setPerformanceFull: () => {},
})

export function PerformanceProfileProvider({ children }) {
  const [autoTier] = useState(() => {
    const resolved = resolvePerformanceTier()
    storePerformanceTier(resolved)
    return resolved
  })
  const [override, setOverride] = useState(() => readPerformanceOverride())
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event) => setPrefersReducedMotion(event.matches)
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    }
    query.addListener(onChange)
    return () => query.removeListener(onChange)
  }, [])

  const effectiveTier = useMemo(
    () => resolveEffectiveTier({
      autoTier: prefersReducedMotion ? 'minimal' : autoTier,
      override,
    }),
    [autoTier, override, prefersReducedMotion],
  )

  const setPerformanceFull = useCallback((next) => {
    const value = next ? 'on' : 'off'
    storePerformanceOverride(value)
    setOverride(value)
  }, [])

  const profile = useMemo(
    () => ({
      ...tierToProfile(effectiveTier),
      isFullEffects: effectiveTier === 'full',
      hasOverride: override != null,
      setPerformanceFull,
    }),
    [effectiveTier, override, setPerformanceFull],
  )

  return (
    <PerformanceProfileContext.Provider value={profile}>
      {children}
    </PerformanceProfileContext.Provider>
  )
}

export function usePerformanceProfile() {
  return useContext(PerformanceProfileContext)
}
