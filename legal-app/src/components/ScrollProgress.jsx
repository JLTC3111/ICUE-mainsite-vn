import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'

/**
 * Adapted from Magic UI's Scroll Progress. A spring smooths long legal
 * documents and the document accent follows the active route.
 */
export default function ScrollProgress({ color }) {
  const { scrollYProgress } = useScroll()
  const reduceMotion = useReducedMotion()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      className="legal-scroll-progress"
      aria-hidden="true"
      style={{
        backgroundColor: color,
        scaleX: reduceMotion ? scrollYProgress : scaleX,
      }}
    />
  )
}
