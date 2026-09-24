import { createContext, useContext } from 'react'
import { tierToProfile } from '../lib/performanceProfile'

export const PerformanceProfileContext = createContext({
  ...tierToProfile('full'),
  isFullEffects: true,
  hasOverride: false,
  setPerformanceFull: () => {},
})

export function usePerformanceProfile() {
  return useContext(PerformanceProfileContext)
}
