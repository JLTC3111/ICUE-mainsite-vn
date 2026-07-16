import { useEffect, useState } from 'react'
import HomeBackgroundVideoManager, {
  readHomeBackgroundVideoEnabledState,
} from '../lib/homeBackgroundVideo'

if (typeof window !== 'undefined' && !window.HomeBackgroundVideoManager) {
  window.HomeBackgroundVideoManager = HomeBackgroundVideoManager
}

export function useHomeBackgroundVideoEnabled() {
  const [enabled, setEnabled] = useState(readHomeBackgroundVideoEnabledState)

  useEffect(() => {
    setEnabled(readHomeBackgroundVideoEnabledState())

    const onToggle = (event) => {
      setEnabled(!!event.detail?.enabled)
    }

    window.addEventListener('icue:homeVideoEnabled', onToggle)
    return () => window.removeEventListener('icue:homeVideoEnabled', onToggle)
  }, [])

  return enabled
}
