import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_RESUME_MIN_HIDDEN_MS, subscribeToPageResume } from './pageResume.js'

/** Changing a callback must not erase how long the tab has been hidden. */
export function usePageResume(callback, { minHiddenMs = PAGE_RESUME_MIN_HIDDEN_MS, enabled = true } = {}) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback }, [callback])
  useEffect(() => {
    if (!enabled) return undefined
    return subscribeToPageResume((event) => callbackRef.current(event), { minHiddenMs })
  }, [minHiddenMs, enabled])
}

export function useResumeRevision(options) {
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  usePageResume(refresh, options)
  return [revision, refresh]
}
