import { useResumeRevision } from '../../../shared/resilience/usePageResume.js'
import { useEffect, useState, useCallback, useRef } from 'react'
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

  const busyRef = useRef(false)
  const [revision] = useResumeRevision({ minHiddenMs: 0 })

  useEffect(() => {
    if (busy) return undefined
    let active = true
    const controller = new AbortController()
    getHearts(articleId, { signal: controller.signal })
      .then((r) => {
        if (!active || busyRef.current) return
        setLiked(r.liked)
        setCount(r.count)
        setReady(true)
      })
      .catch(() => active && setReady(true))
    return () => { active = false; controller.abort() }
  }, [articleId, busy, revision])

  const onClick = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
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
      busyRef.current = false
      setBusy(false)
    }
  }, [articleId, liked])

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
