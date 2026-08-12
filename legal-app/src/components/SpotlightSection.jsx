import { useRef } from 'react'

/**
 * Light-theme adaptation of ReactBits' Spotlight Card. The pointer glow is
 * deliberately subtle so it supports scanning instead of competing with text.
 */
export default function SpotlightSection({
  children,
  className = '',
  accent = '#2563eb',
  ...props
}) {
  const cardRef = useRef(null)
  const spotlightRef = useRef(null)

  const updatePosition = (event) => {
    const rect = cardRef.current?.getBoundingClientRect()
    const spotlight = spotlightRef.current
    if (!rect || !spotlight) return

    spotlight.style.opacity = '1'
    spotlight.style.background = `radial-gradient(circle at ${
      event.clientX - rect.left
    }px ${event.clientY - rect.top}px, color-mix(in srgb, ${accent} 13%, transparent), transparent 58%)`
  }

  return (
    <section
      ref={cardRef}
      className={`legal-section ${className}`.trim()}
      onPointerMove={updatePosition}
      onPointerEnter={updatePosition}
      onPointerLeave={() => {
        if (spotlightRef.current) spotlightRef.current.style.opacity = '0'
      }}
      {...props}
    >
      <span
        ref={spotlightRef}
        className="legal-section__spotlight"
        aria-hidden="true"
      />
      <div className="legal-section__content">{children}</div>
    </section>
  )
}
