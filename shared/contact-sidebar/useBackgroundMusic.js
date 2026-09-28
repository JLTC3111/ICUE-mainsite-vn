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

function isAudioPlaying(audio) {
  return Boolean(audio && !audio.paused && !audio.ended && !audio.error && audio.readyState >= 3)
}

/** The utility rail and bird follow the same audio element, including native pauses. */
export function useBackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(() =>
    typeof window !== 'undefined' && isAudioPlaying(window.__icueBackgroundAudio))

  useEffect(() => {
    const audio = getOrCreateAudio()
    if (!audio) return undefined

    const syncPlayback = () => setIsPlaying(isAudioPlaying(audio))
    const stopPlayback = () => setIsPlaying(false)
    const stopEvents = ['pause', 'ended', 'waiting', 'emptied', 'error']

    audio.addEventListener('playing', syncPlayback)
    stopEvents.forEach(event => audio.addEventListener(event, stopPlayback))
    syncPlayback()

    return () => {
      audio.removeEventListener('playing', syncPlayback)
      stopEvents.forEach(event => audio.removeEventListener(event, stopPlayback))
    }
  }, [])

  const toggle = useCallback(async () => {
    const audio = getOrCreateAudio()
    if (!audio) return

    if (audio.paused) {
      // Only media events activate the listeners; a rejected start stays idle.
      await audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [])

  return { toggle, isPlaying }
}
