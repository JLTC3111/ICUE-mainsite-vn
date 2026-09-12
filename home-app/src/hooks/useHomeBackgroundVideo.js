import { useLayoutEffect } from 'react'
import HomeBackgroundVideoManager from '../lib/homeBackgroundVideo'

if (typeof window !== 'undefined' && !window.HomeBackgroundVideoManager) {
  window.HomeBackgroundVideoManager = HomeBackgroundVideoManager
}

export function useHomeBackgroundVideo() {
  useLayoutEffect(() => {
    window.HomeBackgroundVideoManager = HomeBackgroundVideoManager
    HomeBackgroundVideoManager.bindToggleUI()
    HomeBackgroundVideoManager.init()

    const notify = () => window.dispatchEvent(
      new CustomEvent('icue:homeVideoEnabled', {
        detail: { enabled: HomeBackgroundVideoManager.isEnabled() },
      }),
    )
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const updateContext = () => {
      HomeBackgroundVideoManager.init()
      notify()
    }
    motionQuery.addEventListener('change', updateContext)
    connection?.addEventListener('change', updateContext)
    notify()

    return () => {
      motionQuery.removeEventListener('change', updateContext)
      connection?.removeEventListener('change', updateContext)
      HomeBackgroundVideoManager.destroy()
      delete window.HomeBackgroundVideoManager
    }
  }, [])
}
