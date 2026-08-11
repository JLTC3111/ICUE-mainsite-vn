import { useCallback, useRef } from 'react'
import './SpotlightCard.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * React Bits Spotlight Card — adapted for ICUE.
 * @see https://reactbits.dev/components/spotlight-card
 *
 * Upstream renders a fixed rounded `<div>` with its own border, padding and
 * background. 1B's cards are square-cornered and already fully styled, so this
 * port keeps only the mechanism — a radial highlight tracking the pointer via
 * two custom properties — and is polymorphic (`as`) so `.ow-card` stays the
 * `<article>` the scope grid and `:target` rules expect.
 *
 * The move handler is mouse-only. On touch, `pointermove` fires once during a
 * tap and leaves the highlight frozen wherever the finger landed.
 */
export default function SpotlightCard({
  as: Tag = 'div',
  children,
  className = '',
  spotlightColor,
  ...props
}) {
  const ref = useRef(null)

  const handlePointerMove = useCallback((event) => {
    if (event.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`)
    el.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`)
  }, [])

  // Leaving without resetting means a card lit from the left edge re-lights
  // there when the pointer next returns from the right. Fall back to centre,
  // which is also where the keyboard/linked states want it.
  const handlePointerLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--spotlight-x')
    el.style.removeProperty('--spotlight-y')
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn('ow-spotlight', className)}
      style={spotlightColor ? { '--spotlight-color': spotlightColor } : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      <span className="ow-spotlight__glow" aria-hidden="true" />
      {children}
    </Tag>
  )
}
