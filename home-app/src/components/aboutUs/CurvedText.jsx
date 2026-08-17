import { useMemo } from 'react'

/**
 * Lays characters along a shallow arc (circle centered above or below the line).
 *
 * `curve="up"` bows upward (∩); `curve="down"` bows downward (∪), opposite
 * the We Are / Passion row. `segments` carries mixed styles on one arc.
 */
export default function CurvedText({
  segments,
  radius,
  curve = 'up',
  /* Degrees of total sweep; scaled up a little for longer locales. */
  arcDegrees,
  className = '',
  as: Tag = 'div',
}) {
  const chars = useMemo(() => {
    const list = []
    for (const segment of segments) {
      const text = segment?.text ?? ''
      for (const character of text) {
        list.push({
          character,
          className: segment.className || '',
        })
      }
    }
    return list
  }, [segments])

  const mid = (chars.length - 1) / 2
  const totalArc = arcDegrees
    ?? Math.min(68, Math.max(32, chars.length * 2.6))
  const step = chars.length > 1 ? totalArc / (chars.length - 1) : 0

  return (
    <Tag
      className={[
        'about-curved-text',
        curve === 'down' ? 'about-curved-text--down' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={radius != null ? { '--curve-radius': `${radius}px` } : undefined}
      aria-label={chars.map((item) => item.character).join('')}
    >
      {chars.map((item, index) => (
        <span
          // Locale switches rewrite the whole string; index is stable within one render.
          // eslint-disable-next-line react/no-array-index-key
          key={`${item.character}-${index}`}
          className={item.className}
          aria-hidden="true"
          style={{ '--char-angle': `${(index - mid) * step}deg` }}
        >
          {item.character === ' ' ? '\u00A0' : item.character}
        </span>
      ))}
    </Tag>
  )
}
