import { motion, useScroll, useSpring } from 'motion/react'
import './ScrollProgress.css'

const DEFAULT_SPRING_OPTIONS = {
  stiffness: 120,
  damping: 28,
  restDelta: 0.001,
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Motion-Primitives Scroll Progress — adapted for ICUE (no Tailwind).
 * @see https://motion-primitives.com/docs/scroll-progress
 */
export default function ScrollProgress({ className, springOptions, containerRef }) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
    layoutEffect: Boolean(containerRef?.current),
  })

  const scaleX = useSpring(scrollYProgress, {
    ...DEFAULT_SPRING_OPTIONS,
    ...(springOptions ?? {}),
  })

  return (
    <div className={cn('scroll-progress-track', className)} aria-hidden="true">
      <motion.div className="scroll-progress" style={{ scaleX }} />
    </div>
  )
}
