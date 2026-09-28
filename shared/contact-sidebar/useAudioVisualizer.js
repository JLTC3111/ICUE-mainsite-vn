import { useEffect, useState } from 'react'
import { useBackgroundMusic } from './useBackgroundMusic.js'

export function useAudioVisualizer() {
  const { toggle, isPlaying } = useBackgroundMusic()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const syncVisibility = () => setIsVisible(!document.hidden)
    document.addEventListener('visibilitychange', syncVisibility)
    syncVisibility()

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [])

  return { toggle, isPlaying, isAnimating: isPlaying && isVisible }
}
