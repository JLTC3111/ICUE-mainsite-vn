import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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

  const effectiveTier = useMemo(
    () => resolveEffectiveTier({ autoTier, override }),
    [autoTier, override],
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
