import { useCallback, useEffect, useRef } from 'react'

const AUDIO_SRC = '/public/music/mixkit-driving-ambition-32.mp3'

function getOrCreateVisualizer() {
  if (typeof window === 'undefined') return null
  if (window.__icueAudioVisualizer) return window.__icueAudioVisualizer

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null

  const audio = new Audio(AUDIO_SRC)
  const ctx = new AudioContextClass()
  const source = ctx.createMediaElementSource(audio)
  const analyser = ctx.createAnalyser()
  source.connect(analyser)
  analyser.connect(ctx.destination)
  const freqData = new Uint8Array(analyser.frequencyBinCount)
  window.__icueAudioVisualizer = { audio, ctx, analyser, freqData }
  return window.__icueAudioVisualizer
}

export function useAudioVisualizer(barRef) {
  const rafRef = useRef(null)

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (barRef.current) barRef.current.style.transform = 'scale(1)'
  }, [barRef])

  const runLoop = useCallback(function updateVisualizer() {
    const el = barRef.current
    const av = window.__icueAudioVisualizer
    if (!el || !av?.analyser || av.audio.paused || document.hidden) {
      stopLoop()
      return
    }

    av.analyser.getByteFrequencyData(av.freqData)
    const value = av.freqData[0] || 0
    const scale = Math.max(0.85, 1 + value / 512)
    el.style.transform = `scale(${scale})`
    rafRef.current = requestAnimationFrame(updateVisualizer)
  }, [barRef, stopLoop])

  const startLoop = useCallback(() => {
    if (rafRef.current !== null || document.hidden) return
    rafRef.current = requestAnimationFrame(runLoop)
  }, [runLoop])

  const toggle = useCallback(async () => {
    const av = getOrCreateVisualizer()
    if (!av) return
    if (av.audio.paused) {
      if (av.ctx.state === 'suspended') await av.ctx.resume().catch(() => {})
      await av.audio.play().then(startLoop).catch(() => {})
    } else {
      av.audio.pause()
      stopLoop()
    }
  }, [startLoop, stopLoop])

  useEffect(() => {
    const handleVisibilityChange = () => {
      const av = window.__icueAudioVisualizer
      if (document.hidden || !av || av.audio.paused) stopLoop()
      else startLoop()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopLoop()
    }
  }, [startLoop, stopLoop])

  return { toggle }
}
