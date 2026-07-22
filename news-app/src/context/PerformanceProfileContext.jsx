import { createContext, useContext, useMemo, useState } from 'react'
import {
  resolvePerformanceTier,
  storePerformanceTier,
  tierToProfile,
} from '../lib/performanceProfile'

const PerformanceProfileContext = createContext(tierToProfile('full'))

export function PerformanceProfileProvider({ children }) {
  const [tier] = useState(() => {
    const resolved = resolvePerformanceTier()
    storePerformanceTier(resolved)
    return resolved
  })

  const profile = useMemo(() => tierToProfile(tier), [tier])

  return (
    <PerformanceProfileContext.Provider value={profile}>
      {children}
    </PerformanceProfileContext.Provider>
  )
}

export function usePerformanceProfile() {
  return useContext(PerformanceProfileContext)
}
