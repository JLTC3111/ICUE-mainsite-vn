import { useEffect } from 'react'
import HomeBackgroundVideoManager from '../lib/homeBackgroundVideo'

export function useHomeBackgroundVideo() {
  useEffect(() => {
    window.HomeBackgroundVideoManager = HomeBackgroundVideoManager
    HomeBackgroundVideoManager.bindToggleUI()
    HomeBackgroundVideoManager.init()

    return () => {
      HomeBackgroundVideoManager.destroy()
      delete window.HomeBackgroundVideoManager
    }
  }, [])
}
