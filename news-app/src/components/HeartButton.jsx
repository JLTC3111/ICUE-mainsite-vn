import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getHearts, toggleHeart } from '../lib/engagement'
import './Engagement.css'

// IP-based "heart" for an article. Any visitor (no login) can leave one heart;
// clicking again removes it. State is resolved server-side from the visitor IP.
export default function HeartButton({ articleId }) {
  const { t } = useTranslation()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    getHearts(articleId)
      .then((r) => {
        if (!active) return
        setLiked(r.liked)
        setCount(r.count)
        setReady(true)
      })
      .catch(() => active && setReady(true))
    return () => { active = false }
  }, [articleId])

  const onClick = useCallback(async () => {
    if (busy) return
    setBusy(true)
    // Optimistic flip for snappy feedback; reconcile with the server result.
    setLiked((v) => !v)
    setCount((c) => (liked ? c - 1 : c + 1))
    try {
      const r = await toggleHeart(articleId)
      setLiked(r.liked)
      setCount(r.count)
    } catch {
      // Roll back on failure.
      setLiked((v) => !v)
      setCount((c) => (liked ? c + 1 : c - 1))
    } finally {
      setBusy(false)
    }
  }, [articleId, busy, liked])

  return (
    <button
      type="button"
      className={`heart-btn ${liked ? 'is-liked' : ''}`}
      onClick={onClick}
      disabled={busy || !ready}
      aria-pressed={liked}
      aria-label={liked ? t('engagement.liked') : t('engagement.like')}
      title={liked ? t('engagement.liked') : t('engagement.like')}
    >
      <svg className="heart-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s-7.2-4.35-9.6-8.4C.9 9.9 2.1 6.6 5.1 6c1.8-.36 3.6.54 4.5 2.1.9-1.56 2.7-2.46 4.5-2.1 3 .6 4.2 3.9 2.7 6.6C19.2 16.65 12 21 12 21Z" />
      </svg>
      <span className="heart-btn__count">{count}</span>
    </button>
  )
}
