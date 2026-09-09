import { motion, useReducedMotion } from 'motion/react'

const VISIBLE = { opacity: 1, x: 0, y: 0 }
const VIEWPORT = { once: true, amount: 0.1, margin: '0px 0px -50px 0px' }

/** Motion disconnects its viewport observer on unmount, including StrictMode. */
export default function AwardsReveal({ children, className, index = 0, horizontal = false }) {
  const reducedMotion = useReducedMotion()
  const canAnimate = !reducedMotion && typeof IntersectionObserver !== 'undefined'

  return (
    <motion.li
      className={className}
      initial={canAnimate ? {
        opacity: 0,
        x: horizontal ? (index % 2 ? 50 : -50) : 0,
        y: horizontal ? 0 : 30,
      } : false}
      animate={canAnimate ? undefined : VISIBLE}
      whileInView={canAnimate ? VISIBLE : undefined}
      viewport={VIEWPORT}
      transition={{ duration: canAnimate ? 0.6 : 0, delay: canAnimate ? index * 0.1 : 0 }}
    >
      {children}
    </motion.li>
  )
}
