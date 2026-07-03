import { useEffect, useRef } from 'react'
import './BackgroundVideo.css'

export default function BackgroundVideo({ desktopSrc, mobileSrc, enabled }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    if (!enabled) {
      video.pause()
      return undefined
    }

    const play = () => {
      video.play().catch(() => {})
    }

    if (video.readyState >= 2) {
      play()
    } else {
      video.addEventListener('canplay', play, { once: true })
      video.load()
    }

    return () => video.removeEventListener('canplay', play)
  }, [enabled, desktopSrc, mobileSrc])

  useEffect(() => {
    const resume = () => {
      const video = videoRef.current
      if (!video || !enabled || document.visibilityState !== 'visible') return
      if (video.paused) video.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('pageshow', resume)
    return () => {
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('pageshow', resume)
    }
  }, [enabled])

  return (
    <div className={`bg-video ${enabled ? 'bg-video--on' : 'bg-video--off'}`} aria-hidden="true">
      <video
        ref={videoRef}
        key={`${desktopSrc}|${mobileSrc}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="bg-video__el"
      >
        <source src={desktopSrc} type="video/mp4" media="(min-width: 1368px)" />
        <source src={mobileSrc} type="video/mp4" />
      </video>
      {enabled ? (
        <div className="bg-video__overlay" />
      ) : (
        <div className="bg-video__fallback" />
      )}
    </div>
  )
}
