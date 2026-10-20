import { useSyncExternalStore } from 'react'

const query = () => typeof window === 'undefined' ? null : window.matchMedia?.('(prefers-reduced-motion: reduce)')
const snapshot = () => Boolean(query()?.matches)
const serverSnapshot = () => false
const subscribe = listener => {
  const media = query()
  media?.addEventListener('change', listener)
  return () => media?.removeEventListener('change', listener)
}

// Motion's installed hook reads the initial preference only. Vendored effects
// with their own animation engines also need live OS preference changes.
export default function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
