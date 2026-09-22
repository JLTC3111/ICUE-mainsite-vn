import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useRevealOnce } from '../../../../shared/resilience/useRevealOnce.js'

const VISIBLE = { opacity: 1, x: 0, y: 0 }

export default function AwardsReveal({ children, className, index = 0, horizontal = false }) {
  const ref = useRef(null)
  const reducedMotion = useReducedMotion()
  const canAnimate = !reducedMotion && typeof IntersectionObserver !== 'undefined'
  const visible = useRevealOnce(ref, { disabled: !canAnimate, amount: 0.1, margin: '0px 0px -50px 0px' })

  return (
    <motion.li
      ref={ref}
      className={className}
      initial={canAnimate ? {
        opacity: 0,
        x: horizontal ? (index % 2 ? 50 : -50) : 0,
        y: horizontal ? 0 : 30,
      } : false}
      animate={visible ? VISIBLE : undefined}
      transition={{ duration: canAnimate ? 0.6 : 0, delay: canAnimate ? index * 0.1 : 0 }}
    >
      {children}
    </motion.li>
  )
}
