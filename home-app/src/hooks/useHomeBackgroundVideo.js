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

    window.dispatchEvent(
      new CustomEvent('icue:homeVideoEnabled', {
        detail: { enabled: HomeBackgroundVideoManager.isEnabled() },
      }),
    )

    return () => {
      HomeBackgroundVideoManager.destroy()
      delete window.HomeBackgroundVideoManager
    }
  }, [])
}
