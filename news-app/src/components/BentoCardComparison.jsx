import { useEffect, useMemo, useRef, useState } from 'react'
import { beforeClipPath, normalizeSplitPercent } from '../lib/mediaComparison'
import { NEWSROOM_COMPACT_QUERY } from '../lib/newsroom'
import useMediaQuery from '../hooks/useMediaQuery'
import './BentoCardComparison.css'

const REVEAL_DELAY_MS = 180

export default function BentoCardComparison({
  before,
  after,
  staticSplit = false,
  splitPercent = null,
}) {
  const rootRef = useRef(null)
  const compact = useMediaQuery(NEWSROOM_COMPACT_QUERY)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const configuredSplit = splitPercent == null ? null : normalizeSplitPercent(splitPercent)
  // Desktop settles on 50/50; mobile/tablet finishes on the full "after" image.
  const defaultSettleSplit = compact ? 100 : 50
  const settleSplit = configuredSplit ?? defaultSettleSplit
  const forceSettled = staticSplit || reduceMotion
  const [phase, setPhase] = useState(forceSettled ? 'settled' : 'idle') // idle | reveal | settled

  // Once settled, preference changes must not replay the reveal animation.
  if (forceSettled && phase !== 'settled') setPhase('settled')

  const beforeStyle = useMemo(() => {
    if (phase === 'idle') return undefined
    if (phase === 'reveal' && configuredSplit == null) return undefined
    return { clipPath: beforeClipPath(settleSplit) }
  }, [configuredSplit, phase, settleSplit])

  useEffect(() => {
    if (forceSettled || phase !== 'idle') return undefined

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
  }, [phase, forceSettled])

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'clip-path') return
    if (phase !== 'reveal') return
    setPhase('settled')
  }

  if (!before?.url || !after?.url) return null

  const phaseClass = phase === 'reveal' && configuredSplit == null
    ? 'reveal'
    : phase === 'settled' && configuredSplit == null && settleSplit === 50
      ? 'split'
      : phase === 'settled' && configuredSplit == null && settleSplit === 100
        ? 'reveal'
        : null

  return (
    <div
      ref={rootRef}
      className={`bento-card-comparison${phaseClass ? ` bento-card-comparison--${phaseClass}` : ''}${reduceMotion || staticSplit ? ' is-static' : ''}`}
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
        style={beforeStyle}
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
