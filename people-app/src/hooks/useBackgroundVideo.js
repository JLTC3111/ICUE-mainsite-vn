import { useState, useEffect, useCallback } from 'react'
import { readLocalStorage, writeLocalStorage } from '../../../shared/storage/safeLocalStorage.js'

const STORAGE_KEY = 'people_bg_video_enabled'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function prefersSlowNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) return false
  return conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g'
}

function readInitialEnabled() {
  if (prefersReducedMotion() || prefersSlowNetwork()) return false
  const stored = readLocalStorage(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export function useBackgroundVideo() {
  const [enabled, setEnabled] = useState(readInitialEnabled)

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      writeLocalStorage(STORAGE_KEY, next)
      return next
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => {
      if (mq.matches) setEnabled(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return { enabled, toggle, canToggle: !prefersReducedMotion() }
}
