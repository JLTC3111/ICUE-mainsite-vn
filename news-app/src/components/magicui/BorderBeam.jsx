import { motion } from 'motion/react'
import './BorderBeam.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Magic UI Border Beam
 * @see https://magicui.design/docs/components/border-beam
 */
export function BorderBeam({
  className = '',
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}) {
  return (
    <div
      className={cn('border-beam', className)}
      style={{ '--border-beam-width': `${borderWidth}px` }}
      aria-hidden="true"
    >
      <motion.div
        className="border-beam__light"
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          ...style,
        }}
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  )
}
