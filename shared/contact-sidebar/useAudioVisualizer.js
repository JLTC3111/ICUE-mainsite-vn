import { useCallback, useEffect, useState } from 'react'

const AUDIO_SRC = '/public/music/mixkit-driving-ambition-32.mp3'

function getOrCreateAudio() {
  if (typeof window === 'undefined') return null
  if (!window.__icueBackgroundAudio) {
    const audio = new Audio(AUDIO_SRC)
    audio.preload = 'none'
    window.__icueBackgroundAudio = audio
  }
  return window.__icueBackgroundAudio
}

export function useAudioVisualizer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const audio = getOrCreateAudio()
    if (!audio) return

    const syncPlayback = () => {
      setIsPlaying(!audio.paused && !audio.ended && audio.readyState >= 3)
    }
    const stopAnimation = () => setIsPlaying(false)
    const syncVisibility = () => setIsVisible(!document.hidden)
    const stopEvents = ['pause', 'ended', 'waiting', 'emptied', 'error']

    audio.addEventListener('playing', syncPlayback)
    stopEvents.forEach((event) => audio.addEventListener(event, stopAnimation))
    document.addEventListener('visibilitychange', syncVisibility)
    syncPlayback()
    syncVisibility()

    return () => {
      audio.removeEventListener('playing', syncPlayback)
      stopEvents.forEach((event) => audio.removeEventListener(event, stopAnimation))
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [])

  const toggle = useCallback(async () => {
    const audio = getOrCreateAudio()
    if (!audio) return

    if (audio.paused) {
      await audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [])

  return { toggle, isPlaying, isAnimating: isPlaying && isVisible }
}
