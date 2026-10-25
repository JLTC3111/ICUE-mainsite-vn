import { useEffect, useState } from 'react'
import { useBackgroundMusic } from './useBackgroundMusic.js'
import './BackgroundMusicBanner.css'

const copy = {
  vi: { playing: 'Đang phát', close: 'Đóng thông báo bài hát' },
  en: { playing: 'Now playing', close: 'Dismiss song notification' },
  de: { playing: 'Aktueller Titel', close: 'Titelbenachrichtigung schließen' },
  fr: { playing: 'En cours de lecture', close: 'Fermer la notification musicale' },
  ko: { playing: '지금 재생 중', close: '음악 알림 닫기' },
  ja: { playing: '再生中', close: '楽曲の通知を閉じる' },
}

function PlayingBanner({ trackTitle, labels }) {
  const [visible, setVisible] = useState(true)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!visible || focused) return undefined
    const timeout = window.setTimeout(() => setVisible(false), 6000)
    return () => window.clearTimeout(timeout)
  }, [visible, focused])

  if (!visible) return null

  return (
    <div className="icue-music-banner">
      <span className="icue-music-banner__icon" aria-hidden="true">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13M9 8l12-2" />
          <ellipse cx="6" cy="18" rx="3" ry="3" />
          <ellipse cx="18" cy="16" rx="3" ry="3" />
        </svg>
      </span>
      <div className="icue-music-banner__copy" role="status" aria-live="polite" aria-atomic="true">
        <span className="icue-music-banner__label">{labels.playing}</span>
        <span className="icue-music-banner__title">{trackTitle}</span>
      </div>
      <button
        type="button"
        className="icue-music-banner__close"
        aria-label={labels.close}
        onClick={() => setVisible(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}

/** A fresh notification accompanies each actual playback start or resumed page. */
export default function BackgroundMusicBanner({ locale = 'vi' }) {
  const { isPlaying, trackTitle } = useBackgroundMusic()
  if (!isPlaying || !trackTitle) return null
  return <PlayingBanner key={trackTitle} trackTitle={trackTitle} labels={copy[locale] || copy.vi} />
}
