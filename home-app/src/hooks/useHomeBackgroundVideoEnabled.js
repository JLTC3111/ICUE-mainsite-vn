import { useEffect, useState } from 'react'

function readHomeBackgroundVideoEnabled() {
  return !!window.HomeBackgroundVideoManager?.isEnabled?.()
}

export function useHomeBackgroundVideoEnabled() {
  const [enabled, setEnabled] = useState(readHomeBackgroundVideoEnabled)

  useEffect(() => {
    setEnabled(readHomeBackgroundVideoEnabled())

    const onToggle = (event) => {
      setEnabled(!!event.detail?.enabled)
    }

    window.addEventListener('icue:homeVideoEnabled', onToggle)
    return () => window.removeEventListener('icue:homeVideoEnabled', onToggle)
  }, [])

  return enabled
}
