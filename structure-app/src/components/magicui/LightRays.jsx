import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
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

function Ray({ left, rotate, width, swing, delay, duration, intensity }) {
  return (
    <motion.div
      className="light-rays__ray"
      style={{
        '--ray-left': `${left}%`,
        '--ray-width': `${width}px`,
      }}
      initial={{ rotate }}
      animate={{
        opacity: [0, intensity, 0],
        rotate: [rotate - swing, rotate + swing, rotate - swing],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
        repeatDelay: duration * 0.1,
      }}
    />
  )
}

export function LightRays({
  className = '',
  style,
  count = 7,
  color = 'rgba(160, 210, 255, 0.2)',
  blur = 36,
  speed = 14,
  length = '70vh',
  ...props
}) {
  const [rays, setRays] = useState([])
  const cycleDuration = Math.max(speed, 0.1)

  useEffect(() => {
    setRays(createRays(count, cycleDuration))
  }, [count, cycleDuration])

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
