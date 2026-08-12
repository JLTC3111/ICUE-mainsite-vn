import { memo, useMemo } from 'react'
import './LightRays.css'

/**
 * Magic UI Light Rays — animated rays shining from above.
 * @see https://magicui.design/docs/components/light-rays
 */
function createRays(count, cycle) {
  if (count <= 0) return []

  return Array.from({ length: count }, (_, index) => {
    const left = 8 + Math.random() * 84
    const rotate = -28 + Math.random() * 56
    const width = 160 + Math.random() * 160
    const swing = 0.8 + Math.random() * 1.8
    const delay = Math.random() * cycle
    const duration = cycle * (0.75 + Math.random() * 0.5)
    const intensity = 0.6 + Math.random() * 0.5

    return {
      id: `${index}-${Math.round(left * 10)}`,
      left,
      rotate,
      width,
      swing,
      delay,
      duration,
      intensity,
    }
  })
}

/*
 * A ray is a static element with per-instance custom properties; the sweep and
 * fade come from one shared @keyframes in LightRays.css.
 *
 * Previously each ray was a motion.div running an infinite JS-driven animation
 * over `opacity` and `rotate`. Seven of those meant motion/react ticking
 * fourteen animated values on the main thread forever, on a purely decorative
 * backdrop that is often scrolled out of view. As CSS the browser runs them on
 * the compositor and pauses them when the element is off-screen, and the global
 * reduced-motion rule in shared/styles/motion.css switches them off for free.
 */
function Ray({ left, rotate, width, swing, delay, duration, intensity }) {
  return (
    <div
      className="light-rays__ray"
      style={{
        '--ray-left': `${left}%`,
        '--ray-width': `${width}px`,
        '--ray-rotate': `${rotate}deg`,
        '--ray-swing': `${swing}deg`,
        '--ray-delay': `${delay}s`,
        '--ray-duration': `${duration}s`,
        '--ray-intensity': intensity,
      }}
    />
  )
}

function LightRaysImpl({
  className = '',
  style,
  count = 7,
  color = 'rgba(160, 210, 255, 0.2)',
  blur = 36,
  speed = 14,
  length = '70vh',
  ...props
}) {
  const cycleDuration = Math.max(speed, 0.1)

  // Built during render rather than in an effect: the old version mounted with
  // zero rays and then set state, costing an extra render and a visible pop.
  const rays = useMemo(
    () => createRays(count, cycleDuration),
    [count, cycleDuration],
  )

  return (
    <div
      className={`light-rays ${className}`.trim()}
      style={{
        '--light-rays-color': color,
        '--light-rays-blur': `${blur}px`,
        '--light-rays-length': length,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      <div className="light-rays__inner">
        <div className="light-rays__glow light-rays__glow--left" />
        <div className="light-rays__glow light-rays__glow--right" />
        {rays.map((ray) => (
          <Ray key={ray.id} {...ray} />
        ))}
      </div>
    </div>
  )
}

export const LightRays = memo(LightRaysImpl)
export default LightRays
