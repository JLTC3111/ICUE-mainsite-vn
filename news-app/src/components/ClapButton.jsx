import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import PhosphorHandsClapping from './icons/PhosphorHandsClapping'
import { getClaps, toggleClap } from '../lib/engagement'
import './Engagement.css'

// IP-based clap for an article. Independent from hearts — visitors can use both.
export default function ClapButton({ articleId }) {
  const { t } = useTranslation()
  const [clapped, setClapped] = useState(false)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    getClaps(articleId)
      .then((r) => {
        if (!active) return
        setClapped(r.clapped)
        setCount(r.count)
        setReady(true)
      })
      .catch(() => active && setReady(true))
    return () => { active = false }
  }, [articleId])

  const onClick = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setClapped((v) => !v)
    setCount((c) => (clapped ? c - 1 : c + 1))
    try {
      const r = await toggleClap(articleId)
      setClapped(r.clapped)
      setCount(r.count)
    } catch {
      setClapped((v) => !v)
      setCount((c) => (clapped ? c + 1 : c - 1))
    } finally {
      setBusy(false)
    }
  }, [articleId, busy, clapped])

  return (
    <button
      type="button"
      className={`engagement-chip clap-btn${clapped ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={busy || !ready}
      aria-pressed={clapped}
      aria-label={clapped ? t('engagement.clapped') : t('engagement.clap')}
      title={clapped ? t('engagement.clapped') : t('engagement.clap')}
    >
      <PhosphorHandsClapping filled={clapped} className="engagement-chip__icon" />
      <span className="engagement-chip__count">{count}</span>
    </button>
  )
}
