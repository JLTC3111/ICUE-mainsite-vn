import { useEffect, useRef, useState } from 'react'
import './BentoCardComparison.css'

const REVEAL_DELAY_MS = 180

export default function BentoCardComparison({ before, after }) {
  const rootRef = useRef(null)
  const [phase, setPhase] = useState('idle') // idle | reveal | split
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      setPhase('split')
      return undefined
    }

    const node = rootRef.current
    if (!node) return undefined

    let delayId = null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || phase !== 'idle') return
        observer.disconnect()
        delayId = window.setTimeout(() => {
          setPhase('reveal')
        }, REVEAL_DELAY_MS)
      },
      { threshold: 0.25, rootMargin: '0px 0px -4% 0px' },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      if (delayId) window.clearTimeout(delayId)
    }
  }, [phase, reduceMotion])

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'clip-path') return
    if (phase === 'reveal') setPhase('split')
  }

  if (!before?.url || !after?.url) return null

  return (
    <div
      ref={rootRef}
      className={`bento-card-comparison bento-card-comparison--${phase}${reduceMotion ? ' is-static' : ''}`}
      aria-hidden="true"
    >
      <img
        src={after.url}
        alt=""
        className="bento-card-comparison__img"
        loading="lazy"
        decoding="async"
      />
      <div
        className="bento-card-comparison__before"
        onTransitionEnd={handleTransitionEnd}
      >
        <img
          src={before.url}
          alt=""
          className="bento-card-comparison__img"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  )
}
