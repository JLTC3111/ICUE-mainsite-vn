import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import AnimatedBeam from './magicui/AnimatedBeam'

const BEAM_BEND = 72

function createBeamBalancer() {
  let left = 0
  let right = 0

  return {
    counts: () => ({ left, right }),
    assignLeft(magnitude = BEAM_BEND) {
      left += 1
      return -magnitude
    },
    assignRight(magnitude = BEAM_BEND) {
      right += 1
      return magnitude
    },
    assignNext(magnitude = BEAM_BEND) {
      if (left <= right) return this.assignLeft(magnitude)
      return this.assignRight(magnitude)
    },
    assignForCard(cardIndex, cardCount, magnitude = BEAM_BEND) {
      if (cardCount <= 1) return this.assignNext(magnitude)

      const center = (cardCount - 1) / 2
      const offset = cardIndex - center

      if (offset < -0.01) {
        const weight = Math.abs(offset) / (center || 1)
        return this.assignLeft(magnitude * weight)
      }

      if (offset > 0.01) {
        const weight = offset / (center || 1)
        return this.assignRight(magnitude * weight)
      }

      return this.assignNext(magnitude * 0.7)
    },
  }
}

export default function HomeBeamNetwork({
  containerRef,
  heroRef,
  sectionRefs,
  cardRefs,
}) {
  const [ready, setReady] = useState(false)
  const [allowMotion, setAllowMotion] = useState(true)

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setAllowMotion(!media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const connections = useMemo(() => {
    const pairs = []
    const balance = createBeamBalancer()

    sectionRefs.forEach((sectionRef, sectionIndex) => {
      const heroCurvature = balance.assignNext()

      pairs.push({
        key: `hero-section-${sectionIndex}`,
        fromRef: heroRef,
        toRef: sectionRef,
        curvature: heroCurvature,
        reverse: heroCurvature > 0,
        delay: sectionIndex * 0.35,
        startYOffset: 24,
      })

      const cards = cardRefs[sectionIndex] || []
      cards.forEach((cardRef, cardIndex) => {
        const cardCurvature = balance.assignForCard(cardIndex, cards.length)

        pairs.push({
          key: `section-${sectionIndex}-card-${cardIndex}`,
          fromRef: sectionRef,
          toRef: cardRef,
          curvature: cardCurvature,
          reverse: cardCurvature > 0,
          delay: sectionIndex * 0.2 + cardIndex * 0.18,
          endYOffset: -20,
        })
      })
    })

    return pairs
  }, [heroRef, sectionRefs, cardRefs])

  if (!ready || !allowMotion) return null

  return (
    <div className="home-beam-layer" aria-hidden="true">
      {connections.map((connection) => (
        <AnimatedBeam
          key={connection.key}
          containerRef={containerRef}
          fromRef={connection.fromRef}
          toRef={connection.toRef}
          curvature={connection.curvature}
          reverse={connection.reverse}
          bidirectional
          delay={connection.delay}
          duration={4.5}
          pathWidth={2}
          pathOpacity={0.3}
          gradientStartColor="#1db7ff"
          gradientStopColor="#c8ff00"
          startYOffset={connection.startYOffset}
          endYOffset={connection.endYOffset}
        />
      ))}
    </div>
  )
}
