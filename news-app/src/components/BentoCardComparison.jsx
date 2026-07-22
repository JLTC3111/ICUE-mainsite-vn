import { useEffect, useRef, useState } from 'react'
import { NEWSROOM_COMPACT_QUERY } from '../lib/newsroom'
import './BentoCardComparison.css'

const REVEAL_DELAY_MS = 180

function useCompactViewport() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NEWSROOM_COMPACT_QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(NEWSROOM_COMPACT_QUERY)
    const sync = () => setCompact(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return compact
}

export default function BentoCardComparison({ before, after, staticSplit = false }) {
  const rootRef = useRef(null)
  const compact = useCompactViewport()
  // Desktop settles on 50/50; mobile/tablet finishes on the full "after" image.
  const settlePhase = compact ? 'reveal' : 'split'
  const [phase, setPhase] = useState(staticSplit ? settlePhase : 'idle') // idle | reveal | split
  const [reduceMotion, setReduceMotion] = useState(staticSplit)

  useEffect(() => {
    if (staticSplit) {
      setPhase(settlePhase)
      return undefined
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [staticSplit, settlePhase])

  useEffect(() => {
    if (staticSplit || reduceMotion) {
      setPhase(settlePhase)
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
  }, [phase, reduceMotion, staticSplit, settlePhase])

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'clip-path') return
    if (phase === 'reveal' && settlePhase === 'split') setPhase('split')
  }

  if (!before?.url || !after?.url) return null

  return (
    <div
      ref={rootRef}
      className={`bento-card-comparison bento-card-comparison--${phase}${reduceMotion || staticSplit ? ' is-static' : ''}`}
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
