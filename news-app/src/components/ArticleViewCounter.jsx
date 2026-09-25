import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'
import { useTranslation } from 'react-i18next'
import useMediaQuery from '../hooks/useMediaQuery'
import DevIcon174 from './icons/DevIcon174'
import SlidingNumber, { SLOW_SPRING } from './magicui/SlidingNumber'
import './ArticleViewCounter.css'

export default function ArticleViewCounter({ count = 0, compact = false, tone = 'light' }) {
  const { t } = useTranslation()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const parsed = Number(count)
  const safeCount = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
  const [counter, setCounter] = useState({ count: safeCount, value: safeCount })
  const animRef = useRef(null)

  // Reset only this component's animation state before children render a new
  // count. The SlidingNumber instance stays mounted for its normal transition.
  if (counter.count !== safeCount) {
    setCounter({ count: safeCount, value: safeCount })
  }
  const displayValue = counter.count === safeCount ? counter.value : safeCount

  useEffect(() => {
    animRef.current?.stop()
    animRef.current = null
  }, [safeCount])

  useEffect(() => () => {
    animRef.current?.stop()
  }, [])

  const playHoverCount = () => {
    if (reduceMotion || safeCount <= 0) return

    animRef.current?.stop()
    setCounter({ count: safeCount, value: 0 })
    animRef.current = animate(0, safeCount, {
      ...SLOW_SPRING,
      onUpdate: (latest) => setCounter((current) => current.count === safeCount
        ? { count: safeCount, value: Math.round(latest) }
        : current),
      onComplete: () => {
        setCounter((current) => current.count === safeCount
          ? { count: safeCount, value: safeCount }
          : current)
        animRef.current = null
      },
    })
  }

  return (
    <span
      className={`article-view-counter${compact ? ' article-view-counter--compact' : ''}${tone === 'dark' ? ' article-view-counter--dark' : ''}`}
      aria-label={t('engagement.views', { count: safeCount })}
      title={t('engagement.views', { count: safeCount })}
      onMouseEnter={playHoverCount}
    >
      <DevIcon174 className="article-view-counter__icon" />
      <SlidingNumber
        value={displayValue}
        reduceMotion={reduceMotion}
        spring={SLOW_SPRING}
        className="article-view-counter__number"
      />
      <span className="article-view-counter__label">{t('engagement.viewsLabel')}</span>
    </span>
  )
}
