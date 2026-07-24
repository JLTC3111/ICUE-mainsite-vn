import { memo } from 'react'
import './Ripple.css'

/**
 * Magic UI Ripple — adapted for ICUE (no Tailwind).
 * @see https://magicui.design/docs/components/ripple
 */
function RippleComponent({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className = '',
  ...props
}) {
  return (
    <div
      className={`magic-ripple${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70
        const opacity = Math.max(0.04, mainCircleOpacity - i * 0.03)
        return (
          <div
            key={i}
            className="magic-ripple__circle"
            style={{
              '--i': i,
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDelay: `${i * 0.06}s`,
            }}
          />
        )
      })}
    </div>
  )
}

export const Ripple = memo(RippleComponent)
