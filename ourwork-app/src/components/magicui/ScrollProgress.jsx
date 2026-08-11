import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'
import './ScrollProgress.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

const SPRING = { stiffness: 120, damping: 28, restDelta: 0.001 }

/**
 * Magic UI Scroll Progress — adapted for ICUE (no Tailwind).
 * @see https://magicui.design/docs/components/scroll-progress
 *
 * This is the one place the page keeps a second scroll subscription, and it is
 * deliberate: `useScroll` writes to a MotionValue instead of React state, so it
 * drives `scaleX` off the compositor without re-rendering the page or touching
 * the rAF pass in useOurWorkMotion.
 */
export default function ScrollProgress({ className }) {
  const { scrollYProgress } = useScroll()
  const reduceMotion = useReducedMotion()
  const smoothed = useSpring(scrollYProgress, SPRING)

  return (
    <div className={cn('ow-scroll-progress__track', className)} aria-hidden="true">
      <motion.div
        className="ow-scroll-progress__bar"
        style={{ scaleX: reduceMotion ? scrollYProgress : smoothed }}
      />
    </div>
  )
}
