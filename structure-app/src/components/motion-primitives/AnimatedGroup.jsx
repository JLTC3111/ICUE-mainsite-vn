import { useMemo, Children } from 'react'
import { motion } from 'motion/react'

/**
 * motion-primitives Animated Group
 * @see https://motion-primitives.com/docs/animated-group
 */

const defaultContainerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const defaultItemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const presetVariants = {
  fade: {},
  slide: {
    hidden: { y: 20 },
    visible: { y: 0 },
  },
  scale: {
    hidden: { scale: 0.8 },
    visible: { scale: 1 },
  },
  blur: {
    hidden: { filter: 'blur(4px)' },
    visible: { filter: 'blur(0px)' },
  },
  'blur-slide': {
    hidden: { filter: 'blur(4px)', y: 20 },
    visible: { filter: 'blur(0px)', y: 0 },
  },
  zoom: {
    hidden: { scale: 0.5 },
    visible: {
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
  },
  flip: {
    hidden: { rotateX: -90 },
    visible: {
      rotateX: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
  },
  bounce: {
    hidden: { y: -50 },
    visible: {
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 10 },
    },
  },
  rotate: {
    hidden: { rotate: -180 },
    visible: {
      rotate: 0,
      transition: { type: 'spring', stiffness: 200, damping: 15 },
    },
  },
  swing: {
    hidden: { rotate: -10 },
    visible: {
      rotate: 0,
      transition: { type: 'spring', stiffness: 300, damping: 8 },
    },
  },
}

function addDefaultVariants(variants = {}) {
  return {
    hidden: { ...defaultItemVariants.hidden, ...variants.hidden },
    visible: { ...defaultItemVariants.visible, ...variants.visible },
  }
}

/** Custom variants from motion-primitives “AnimatedGroup with custom variants” example. */
export const animatedGroupCustomVariants2 = {
  container: {
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: -60,
      rotateX: 90,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      rotateX: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1,
      },
    },
  },
}

export function AnimatedGroup({
  children,
  className = '',
  variants,
  preset,
  as: Component = 'div',
  asChild: ChildComponent = 'div',
}) {
  const selectedVariants = {
    item: addDefaultVariants(preset ? presetVariants[preset] : {}),
    container: addDefaultVariants(defaultContainerVariants),
  }
  const containerVariants = variants?.container || selectedVariants.container
  const itemVariants = variants?.item || selectedVariants.item

  const MotionComponent = useMemo(
    () => motion.create(Component),
    [Component],
  )
  const MotionChild = useMemo(
    () => motion.create(ChildComponent),
    [ChildComponent],
  )

  return (
    <MotionComponent
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {Children.map(children, (child, index) => {
        if (child == null || child === false) return null
        return (
          <MotionChild key={child.key ?? index} variants={itemVariants}>
            {child}
          </MotionChild>
        )
      })}
    </MotionComponent>
  )
}
