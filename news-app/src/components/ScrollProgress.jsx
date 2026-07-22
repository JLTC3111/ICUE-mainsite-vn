import { motion, useMotionValue, useScroll, useSpring } from 'motion/react'
import { useEffect } from 'react'
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
export default function ScrollProgress({ className, springOptions, containerRef, progress: externalProgress }) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
    layoutEffect: Boolean(containerRef?.current),
  })
  const pageProgress = useMotionValue(typeof externalProgress === 'number' ? externalProgress : 0)

  useEffect(() => {
    if (typeof externalProgress === 'number') {
      pageProgress.set(externalProgress)
    }
  }, [externalProgress, pageProgress])

  const source = typeof externalProgress === 'number' ? pageProgress : scrollYProgress

  const scaleX = useSpring(source, {
    ...DEFAULT_SPRING_OPTIONS,
    ...(springOptions ?? {}),
  })

  return (
    <div className={cn('scroll-progress-track', className)} aria-hidden="true">
      <motion.div className="scroll-progress" style={{ scaleX }} />
    </div>
  )
}
