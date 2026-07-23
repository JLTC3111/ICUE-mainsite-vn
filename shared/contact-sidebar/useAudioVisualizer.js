import { useCallback, useEffect, useRef } from 'react'

const AUDIO_SRC = '/public/music/mixkit-driving-ambition-32.mp3'

function getOrCreateVisualizer() {
  if (typeof window === 'undefined') return null
  if (window.__icueAudioVisualizer) return window.__icueAudioVisualizer

  const audio = new Audio(AUDIO_SRC)
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
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

  const toggle = useCallback(() => {
    const av = getOrCreateVisualizer()
    if (!av) return
    if (av.ctx.state === 'suspended') av.ctx.resume()
    if (av.audio.paused) av.audio.play().catch(() => {})
    else av.audio.pause()
  }, [])

  useEffect(() => {
    getOrCreateVisualizer()
    const loop = () => {
      const el = barRef.current
      const av = window.__icueAudioVisualizer
      if (el && av?.analyser) {
        av.analyser.getByteFrequencyData(av.freqData)
        const value = av.freqData[0] || 0
        const scale = Math.max(0.85, 1 + value / 512)
        el.style.transform = `scale(${scale})`
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [barRef])

  return { toggle }
}
