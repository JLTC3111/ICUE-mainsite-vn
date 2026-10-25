import { readSessionStorage, writeSessionStorage } from '../storage/safeSessionStorage.js'

const AUDIO_SRC = '/public/music/mixkit-driving-ambition-32.mp3'
const STORAGE_KEY = 'icue-background-music'

export function getBackgroundTrackFileName(src = AUDIO_SRC) {
  if (typeof src !== 'string' || !src) return ''
  const cleanPath = src.split(/[?#]/, 1)[0]
  const fileName = cleanPath.split('/').filter(Boolean).pop() || ''
  try {
    return decodeURIComponent(fileName)
  } catch {
    return fileName
  }
}

export const BACKGROUND_MUSIC_TITLE = getBackgroundTrackFileName(AUDIO_SRC)

function readPlayback() {
  try {
    const saved = JSON.parse(readSessionStorage(STORAGE_KEY))
    if (saved?.version === 1 && saved.src === AUDIO_SRC
      && typeof saved.playing === 'boolean'
      && Number.isFinite(saved.currentTime) && saved.currentTime >= 0) return saved
  } catch { /* Invalid or unavailable session storage starts quietly. */ }
  return null
}

function createPlayer() {
  const audio = window.__icueBackgroundAudio || new Audio(AUDIO_SRC)
  audio.preload = 'none'
  window.__icueBackgroundAudio = audio

  const saved = readPlayback()
  let wantsPlayback = saved?.playing || false
  let pendingPosition = saved?.currentTime ?? null
  let leavingPage = false
  let pendingRequest = null
  let attempt = 0
  let retryArmed = false
  let savedSecond = -1

  const persist = () => {
    if (leavingPage) return
    const currentTime = pendingPosition ?? audio.currentTime
    writeSessionStorage(STORAGE_KEY, JSON.stringify({
      version: 1, src: AUDIO_SRC, playing: wantsPlayback,
      currentTime: Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0,
    }))
  }

  const restorePosition = () => {
    if (pendingPosition === null || audio.readyState < 1) return
    const target = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(pendingPosition, audio.duration) : pendingPosition
    // Metadata can arrive before this part of the track is seekable. Seeking
    // too early silently clamps to zero in Chromium on streaming responses.
    if (target > 0 && audio.seekable) {
      let available = false
      for (let index = 0; index < audio.seekable.length; index++) {
        if (target >= audio.seekable.start(index) && target <= audio.seekable.end(index)) available = true
      }
      if (!available) return
    }
    try {
      audio.currentTime = target
      if (Math.abs(audio.currentTime - target) < 0.25) pendingPosition = null
    } catch { /* Some engines require loadedmetadata before seeking. */ }
  }

  const stopGestureRetry = () => {
    document.removeEventListener('click', retryPlayback)
    document.removeEventListener('keydown', retryPlayback)
    retryArmed = false
  }

  const handleRejectedPlayback = (error, requestAttempt) => {
    if (requestAttempt !== attempt || !wantsPlayback || leavingPage) return
    if (error?.name === 'NotAllowedError' && !retryArmed) {
      document.addEventListener('click', retryPlayback)
      document.addEventListener('keydown', retryPlayback)
      retryArmed = true
    }
  }

  function requestPlayback() {
    if (pendingRequest) return pendingRequest
    if (!wantsPlayback || leavingPage) return Promise.resolve()
    restorePosition()
    const requestAttempt = ++attempt
    try {
      pendingRequest = Promise.resolve(audio.play())
        .catch(error => handleRejectedPlayback(error, requestAttempt))
        .finally(() => {
          if (requestAttempt === attempt) pendingRequest = null
        })
      return pendingRequest
    } catch (error) {
      handleRejectedPlayback(error, requestAttempt)
      return Promise.resolve()
    }
  }

  function retryPlayback(event) {
    // The music button handles its own click/keyboard activation.
    if (event.defaultPrevented || event.target?.closest?.('[data-icue-music-toggle]')) return
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return
    if (wantsPlayback) void requestPlayback()
  }

  function pause() {
    wantsPlayback = false
    ++attempt
    pendingRequest = null
    stopGestureRetry()
    audio.pause()
    persist()
  }

  // These listeners belong to the document's player, independently of React
  // subscribers, so route/component unmounts never stop or reset the music.
  audio.addEventListener('loadedmetadata', restorePosition)
  audio.addEventListener('canplay', restorePosition)
  audio.addEventListener('progress', restorePosition)
  audio.addEventListener('playing', () => {
    if (leavingPage || audio.paused) return
    wantsPlayback = true
    stopGestureRetry()
    persist()
  })
  audio.addEventListener('pause', () => {
    // Navigation and browser suspension must not overwrite the play choice.
    if (leavingPage || !audio.paused || document.hidden || audio.ended) return
    wantsPlayback = false
    stopGestureRetry()
    persist()
  })
  audio.addEventListener('ended', () => {
    if (leavingPage || !audio.ended) return
    wantsPlayback = false
    stopGestureRetry()
    persist()
  })
  audio.addEventListener('timeupdate', () => {
    const second = Math.floor(audio.currentTime)
    if (second !== savedSecond) {
      savedSecond = second
      persist()
    }
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persist()
  })
  window.addEventListener('pagehide', () => {
    persist()
    leavingPage = true
    stopGestureRetry()
  })
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return
    leavingPage = false
    // A cached document may predate music played or paused in another section.
    const latest = readPlayback()
    if (latest) {
      wantsPlayback = latest.playing
      pendingPosition = latest.currentTime
    }
    ++attempt
    pendingRequest = null
    restorePosition()
    if (wantsPlayback) void requestPlayback()
    else pause()
  })

  if (wantsPlayback) void requestPlayback()
  // Do not load a paused track until the visitor asks to hear it.
  else restorePosition()

  return {
    audio,
    toggle() {
      if (!audio.paused || pendingRequest) {
        pause()
        return Promise.resolve()
      }
      wantsPlayback = true
      persist()
      return requestPlayback()
    },
  }
}

export function getBackgroundAudio() {
  if (typeof window === 'undefined') return null
  window.__icueBackgroundMusic ||= createPlayer()
  return window.__icueBackgroundMusic.audio
}

export function toggleBackgroundMusic() {
  if (!getBackgroundAudio()) return Promise.resolve()
  return window.__icueBackgroundMusic.toggle()
}
