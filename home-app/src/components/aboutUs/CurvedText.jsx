import { useMemo } from 'react'

/**
 * Lays characters along a shallow upward arc (circle centered below the line).
 *
 * `segments` lets one arc carry mixed styles — e.g. Caveat “We Are” beside
 * yellow “PASSION” — without splitting into two competing transforms.
 */
export default function CurvedText({
  segments,
  radius,
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
      className={`about-curved-text${className ? ` ${className}` : ''}`}
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
