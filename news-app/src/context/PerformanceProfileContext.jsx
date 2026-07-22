import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  isPerformanceOptimized,
  readPerformanceOverride,
  resolveEffectiveTier,
  resolvePerformanceTier,
  storePerformanceOverride,
  storePerformanceTier,
  tierToProfile,
} from '../lib/performanceProfile'

const PerformanceProfileContext = createContext({
  ...tierToProfile('minimal'),
  isOptimized: true,
  hasOverride: false,
  setPerformanceOptimized: () => {},
})

export function PerformanceProfileProvider({ children }) {
  const [autoTier] = useState(() => {
    const resolved = resolvePerformanceTier()
    storePerformanceTier(resolved)
    return resolved
  })
  const [override, setOverride] = useState(() => readPerformanceOverride())

  const effectiveTier = useMemo(
    () => resolveEffectiveTier({ autoTier, override }),
    [autoTier, override],
  )

  const setPerformanceOptimized = useCallback((next) => {
    const value = next ? 'on' : 'off'
    storePerformanceOverride(value)
    setOverride(value)
  }, [])

  const profile = useMemo(
    () => ({
      ...tierToProfile(effectiveTier),
      isOptimized: isPerformanceOptimized(effectiveTier),
      hasOverride: override != null,
      setPerformanceOptimized,
    }),
    [effectiveTier, override, setPerformanceOptimized],
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
