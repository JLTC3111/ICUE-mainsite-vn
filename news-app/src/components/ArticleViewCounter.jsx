import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import useMediaQuery from '../hooks/useMediaQuery'
import SlidingNumber from './magicui/SlidingNumber'
import './ArticleViewCounter.css'

export default function ArticleViewCounter({ count = 0, compact = false, tone = 'light' }) {
  const { t } = useTranslation()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const parsed = Number(count)
  const safeCount = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
  const [displayValue, setDisplayValue] = useState(safeCount)
  const settleRafRef = useRef(0)

  useEffect(() => {
    setDisplayValue(safeCount)
  }, [safeCount])

  useEffect(() => () => {
    if (settleRafRef.current) cancelAnimationFrame(settleRafRef.current)
  }, [])

  const playHoverRoll = () => {
    if (reduceMotion || compact) return
    if (settleRafRef.current) cancelAnimationFrame(settleRafRef.current)

    // Nudge last digit so SlidingNumber has a from→to to animate.
    const nudge = safeCount === 0 ? 1 : safeCount - 1
    setDisplayValue(nudge)
    settleRafRef.current = requestAnimationFrame(() => {
      settleRafRef.current = requestAnimationFrame(() => {
        setDisplayValue(safeCount)
        settleRafRef.current = 0
      })
    })
  }

  return (
    <span
      className={`article-view-counter${compact ? ' article-view-counter--compact' : ''}${tone === 'dark' ? ' article-view-counter--dark' : ''}`}
      aria-label={t('engagement.views', { count: safeCount })}
      title={t('engagement.views', { count: safeCount })}
      onMouseEnter={playHoverRoll}
    >
      <Eye className="article-view-counter__icon" aria-hidden="true" />
      <SlidingNumber
        value={displayValue}
        reduceMotion={reduceMotion}
        className="article-view-counter__number"
      />
      <span className="article-view-counter__label">{t('engagement.viewsLabel')}</span>
    </span>
  )
}
