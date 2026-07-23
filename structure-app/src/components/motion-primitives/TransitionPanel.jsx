import { AnimatePresence, motion } from 'motion/react'

/**
 * motion-primitives Transition Panel
 * @see https://motion-primitives.com/docs/transition-panel
 */
export function TransitionPanel({
  children,
  className = '',
  transition,
  variants,
  activeIndex,
  ...motionProps
}) {
  const panels = Array.isArray(children) ? children : [children]

  return (
    <div className={['transition-panel', className].filter(Boolean).join(' ')}>
      <AnimatePresence
        initial={false}
        mode="popLayout"
        custom={motionProps.custom}
      >
        <motion.div
          key={activeIndex}
          variants={variants}
          transition={transition}
          initial="enter"
          animate="center"
          exit="exit"
          {...motionProps}
        >
          {panels[activeIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
