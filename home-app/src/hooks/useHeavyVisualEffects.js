import { useEffect, useState } from 'react'

function canUseHeavyVisualEffects() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (window.matchMedia('(max-width: 768px)').matches) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  return true
}

export function useHeavyVisualEffects() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(max-width: 768px)'),
      window.matchMedia('(pointer: coarse)'),
    ]

    const update = () => setEnabled(canUseHeavyVisualEffects())
    update()

    queries.forEach((query) => query.addEventListener('change', update))
    return () => queries.forEach((query) => query.removeEventListener('change', update))
  }, [])

  return enabled
}
