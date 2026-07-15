import { memo } from 'react'
import { motion } from 'motion/react'
import './TextShimmerWave.css'

/**
 * motion-primitives Text Shimmer Wave
 * @see https://motion-primitives.com/docs/text-shimmer-wave
 */
function TextShimmerWaveComponent({
  children,
  as: Component = 'span',
  className = '',
  duration = 1,
  zDistance = 10,
  xDistance = 2,
  yDistance = -2,
  spread = 1,
  scaleDistance = 1.1,
  rotateYDistance = 10,
  transition,
  active = true,
}) {
  const MotionComponent = motion.create(Component)
  const text = String(children ?? '')

  if (!active) {
    return <Component className={`text-shimmer-wave${className ? ` ${className}` : ''}`}>{text}</Component>
  }

  return (
    <MotionComponent
      className={`text-shimmer-wave text-shimmer-wave--active${className ? ` ${className}` : ''}`}
    >
      {text.split('').map((char, i) => {
        const delay = (i * duration * (1 / spread)) / Math.max(text.length, 1)

        return (
          <motion.span
            key={`${char}-${i}`}
            className="text-shimmer-wave__char"
            initial={{
              translateZ: 0,
              scale: 1,
              rotateY: 0,
              color: 'var(--base-color)',
            }}
            animate={{
              translateZ: [0, zDistance, 0],
              translateX: [0, xDistance, 0],
              translateY: [0, yDistance, 0],
              scale: [1, scaleDistance, 1],
              rotateY: [0, rotateYDistance, 0],
              color: [
                'var(--base-color)',
                'var(--base-gradient-color)',
                'var(--base-color)',
              ],
            }}
            transition={{
              duration,
              repeat: Infinity,
              repeatDelay: (text.length * 0.05) / spread,
              delay,
              ease: 'easeInOut',
              ...transition,
            }}
          >
            {char}
          </motion.span>
        )
      })}
    </MotionComponent>
  )
}

export const TextShimmerWave = memo(TextShimmerWaveComponent)
