import { useRef } from 'react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react'

/**
 * Adapted from Magic UI's Blur Fade component. The legal app keeps the
 * restrained reveal but disables it when the reader requests reduced motion.
 */
export default function BlurFade({
  children,
  className,
  delay = 0,
  offset = 8,
  inView = true,
}) {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, margin: '-48px' })
  const reduceMotion = useReducedMotion()
  const shouldShow = !inView || visible

  const variants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { y: offset, opacity: 0, filter: 'blur(6px)' },
        visible: { y: 0, opacity: 1, filter: 'blur(0px)' },
      }

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={shouldShow ? 'visible' : 'hidden'}
        exit="hidden"
        variants={variants}
        transition={{ delay, duration: 0.42, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
