import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import PhosphorHeart from './icons/PhosphorHeart'
import { getHearts, toggleHeart } from '../lib/engagement'
import './Engagement.css'

// IP-based heart for an article. Independent from claps — visitors can use both.
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
    setLiked((v) => !v)
    setCount((c) => (liked ? c - 1 : c + 1))
    try {
      const r = await toggleHeart(articleId)
      setLiked(r.liked)
      setCount(r.count)
    } catch {
      setLiked((v) => !v)
      setCount((c) => (liked ? c + 1 : c - 1))
    } finally {
      setBusy(false)
    }
  }, [articleId, busy, liked])

  return (
    <button
      type="button"
      className={`engagement-chip heart-btn${liked ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={busy || !ready}
      aria-pressed={liked}
      aria-label={liked ? t('engagement.liked') : t('engagement.like')}
      title={liked ? t('engagement.liked') : t('engagement.like')}
    >
      <PhosphorHeart filled={liked} className="engagement-chip__icon" />
      <span className="engagement-chip__count">{count}</span>
    </button>
  )
}
