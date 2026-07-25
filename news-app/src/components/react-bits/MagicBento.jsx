import { useEffect, useRef } from 'react'
import './MagicBento.css'

/**
 * React Bits Magic Bento — structural shell for app panels.
 * Spotlight + border glow only (no tilt/magnetism — keeps forms usable).
 * @see https://reactbits.dev/components/magic-bento
 */

const DEFAULT_GLOW = '160, 170, 185'
const DEFAULT_RADIUS = 320

function updateCardGlow(card, mouseX, mouseY, glow, radius) {
  const rect = card.getBoundingClientRect()
  const relativeX = ((mouseX - rect.left) / Math.max(rect.width, 1)) * 100
  const relativeY = ((mouseY - rect.top) / Math.max(rect.height, 1)) * 100
  card.style.setProperty('--glow-x', `${relativeX}%`)
  card.style.setProperty('--glow-y', `${relativeY}%`)
  card.style.setProperty('--glow-intensity', String(glow))
  card.style.setProperty('--glow-radius', `${radius}px`)
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.enableSpotlight]
 * @param {boolean} [props.enableBorderGlow]
 * @param {number} [props.spotlightRadius]
 * @param {string} [props.glowColor] RGB triplet e.g. "160, 170, 185"
 */
export function MagicBentoSection({
  children,
  className = '',
  enableSpotlight = true,
  enableBorderGlow = true,
  spotlightRadius = DEFAULT_RADIUS,
  glowColor = DEFAULT_GLOW,
  ...props
}) {
  const sectionRef = useRef(null)
  const spotlightRef = useRef(null)

  useEffect(() => {
    if (!enableSpotlight || !sectionRef.current) return undefined

    const spotlight = document.createElement('div')
    spotlight.className = 'magic-bento-spotlight'
    spotlight.style.setProperty('--mb-glow', glowColor)
    document.body.appendChild(spotlight)
    spotlightRef.current = spotlight

    const proximity = spotlightRadius * 0.5
    const fadeDistance = spotlightRadius * 0.75

    const onMove = (e) => {
      const section = sectionRef.current
      const spot = spotlightRef.current
      if (!section || !spot) return

      const rect = section.getBoundingClientRect()
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      const cards = section.querySelectorAll('.magic-bento-card')

      if (!inside) {
        spot.style.opacity = '0'
        cards.forEach((card) => card.style.setProperty('--glow-intensity', '0'))
        return
      }

      let minDistance = Infinity
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect()
        const centerX = cardRect.left + cardRect.width / 2
        const centerY = cardRect.top + cardRect.height / 2
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) -
          Math.max(cardRect.width, cardRect.height) / 2
        const effective = Math.max(0, distance)
        minDistance = Math.min(minDistance, effective)

        let glow = 0
        if (effective <= proximity) glow = 1
        else if (effective <= fadeDistance) {
          glow = (fadeDistance - effective) / (fadeDistance - proximity)
        }
        if (enableBorderGlow) updateCardGlow(card, e.clientX, e.clientY, glow, spotlightRadius)
      })

      spot.style.left = `${e.clientX}px`
      spot.style.top = `${e.clientY}px`
      const opacity =
        minDistance <= proximity
          ? 0.55
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.55
            : 0
      spot.style.opacity = String(opacity)
    }

    const onLeave = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '0'
      sectionRef.current
        ?.querySelectorAll('.magic-bento-card')
        .forEach((card) => card.style.setProperty('--glow-intensity', '0'))
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      spotlight.remove()
      spotlightRef.current = null
    }
  }, [enableSpotlight, enableBorderGlow, spotlightRadius, glowColor])

  return (
    <div
      ref={sectionRef}
      className={`magic-bento-section bento-section${className ? ` ${className}` : ''}`}
      style={{ '--mb-glow': glowColor }}
      {...props}
    >
      {children}
    </div>
  )
}

export function MagicBentoCard({
  children,
  className = '',
  as: Comp = 'div',
  enableBorderGlow = true,
  ...props
}) {
  return (
    <Comp
      className={`magic-bento-card card${enableBorderGlow ? ' card--border-glow' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </Comp>
  )
}
