import { memo, useMemo } from 'react'
import { motion } from 'motion/react'
import './TextShimmer.css'

/**
 * motion-primitives Text Shimmer (basic)
 * @see https://motion-primitives.com/docs/text-shimmer
 */
function TextShimmerComponent({
  children,
  as: Component = 'span',
  className = '',
  duration = 1,
  spread = 2,
  active = true,
}) {
  const MotionComponent = motion.create(Component)
  const dynamicSpread = useMemo(
    () => String(children ?? '').length * spread,
    [children, spread],
  )

  return (
    <MotionComponent
      className={`text-shimmer${active ? ' text-shimmer--active' : ''}${className ? ` ${className}` : ''}`}
      initial={false}
      animate={
        active
          ? { backgroundPosition: ['100% center', '0% center'] }
          : { backgroundPosition: '100% center' }
      }
      transition={
        active
          ? { repeat: Infinity, duration, ease: 'linear' }
          : { duration: 0 }
      }
      style={{ '--spread': `${dynamicSpread}px` }}
    >
      {children}
    </MotionComponent>
  )
}

export const TextShimmer = memo(TextShimmerComponent)
