import { useEffect, useRef } from 'react'
import './StarBorder.css'

/**
 * React Bits "Star Border" — a pair of travelling glows along the edges.
 * @see https://reactbits.dev/animations/star-border
 *
 * Fill, line, type and glow colour come from CSS variables so a parent theme
 * can switch light/dark without remounting. `color` / `backgroundColor` /
 * `textColor` / `borderColor` still override when a caller needs a one-off.
 *
 * Light fallbacks match the awards cards; `[data-about-theme='dark']` falls
 * back to upstream's black fill, white type and #222 line.
 */
export default function StarBorder({
  as: Component = 'button',
  className = '',
  color,
  speed = '6s',
  thickness = 1,
  backgroundColor,
  textColor,
  borderColor,
  children,
  style,
  ...rest
}) {
  const rootRef = useRef(null)
  const glowStyle = {
    animationDuration: speed,
    ...(color
      ? { background: `radial-gradient(circle, ${color}, transparent 10%)` }
      : null),
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        el.classList.toggle('star-border-container--offscreen', !entry.isIntersecting)
      },
      { rootMargin: '80px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Component
      className={`star-border-container ${className}`.trim()}
      style={{
        padding: `${thickness}px 0`,
        ...style,
      }}
      {...rest}
      ref={rootRef}
    >
      <div
        className="star-border-glow star-border-glow--bottom"
        data-decorative-motion
        style={glowStyle}
        aria-hidden="true"
      />
      <div
        className="star-border-glow star-border-glow--top"
        data-decorative-motion
        style={glowStyle}
        aria-hidden="true"
      />
      <div
        className="star-border-inner"
        style={{
          ...(backgroundColor ? { background: backgroundColor } : null),
          ...(textColor ? { color: textColor } : null),
          ...(borderColor ? { borderColor } : null),
        }}
      >
        {children}
      </div>
    </Component>
  )
}
