import { useResumeRevision } from '../../../shared/resilience/usePageResume.js'
import { useEffect, useState, useCallback, useRef } from 'react'
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

  const busyRef = useRef(false)
  const [revision] = useResumeRevision({ minHiddenMs: 0 })

  useEffect(() => {
    if (busy) return undefined
    let active = true
    const controller = new AbortController()
    getClaps(articleId, { signal: controller.signal })
      .then((r) => {
        if (!active || busyRef.current) return
        setClapped(r.clapped)
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
      busyRef.current = false
      setBusy(false)
    }
  }, [articleId, clapped])

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
