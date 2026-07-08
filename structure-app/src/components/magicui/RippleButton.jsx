import { forwardRef, useEffect, useState } from 'react'
import './RippleButton.css'

function parseDurationMs(duration) {
  const ms = Number.parseInt(String(duration), 10)
  return Number.isFinite(ms) ? ms : 600
}

/**
 * Magic UI Ripple Button
 * @see https://magicui.design/docs/components/ripple-button
 */
export const RippleButton = forwardRef(function RippleButton(
  {
    className = '',
    children,
    rippleColor = '#ffffff',
    duration = '600ms',
    onClick,
    ...props
  },
  ref,
) {
  const [ripples, setRipples] = useState([])

  function handleClick(event) {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    setRipples((prev) => [...prev, { x, y, size, key: Date.now() }])
    onClick?.(event)
  }

  useEffect(() => {
    if (!ripples.length) return undefined

    const lastRipple = ripples[ripples.length - 1]
    const timeout = window.setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.key !== lastRipple.key))
    }, parseDurationMs(duration))

    return () => window.clearTimeout(timeout)
  }, [ripples, duration])

  return (
    <button
      ref={ref}
      type="button"
      className={`ripple-button ${className}`.trim()}
      onClick={handleClick}
      {...props}
    >
      <span className="ripple-button__label">{children}</span>
      <span className="ripple-button__ripples" aria-hidden="true">
        {ripples.map((ripple) => (
          <span
            key={ripple.key}
            className="ripple-button__ripple"
            style={{
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              top: `${ripple.y}px`,
              left: `${ripple.x}px`,
              backgroundColor: rippleColor,
              '--ripple-duration': duration,
            }}
          />
        ))}
      </span>
    </button>
  )
})
