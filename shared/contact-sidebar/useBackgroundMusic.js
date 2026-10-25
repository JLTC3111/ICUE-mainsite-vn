import { useCallback, useEffect, useState } from 'react'
import { BACKGROUND_MUSIC_TITLE, getBackgroundAudio, toggleBackgroundMusic } from './backgroundMusic.js'

function isAudioPlaying(audio) {
  return Boolean(audio && !audio.paused && !audio.ended && !audio.error && audio.readyState >= 3)
}

/** The utility rail and bird follow the same audio element, including native pauses. */
export function useBackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(() =>
    typeof window !== 'undefined' && isAudioPlaying(window.__icueBackgroundAudio))

  useEffect(() => {
    const audio = getBackgroundAudio()
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

  const toggle = useCallback(() => toggleBackgroundMusic(), [])

  return { toggle, isPlaying, trackTitle: BACKGROUND_MUSIC_TITLE }
}
