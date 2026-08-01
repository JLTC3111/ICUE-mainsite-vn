import { useEffect } from 'react'
import { subscribeToPageResume } from '../lib/pageResume'

/** Run a stable callback after a meaningful mobile-tab resume or reconnect. */
export function usePageResume(onResume) {
  useEffect(
    () => subscribeToPageResume(onResume),
    [onResume],
  )
}
