import React from 'react'
import { motion } from 'motion/react'
import './ShinyButton.css'

const animationProps = {
  initial: { '--x': '100%', scale: 0.8 },
  animate: { '--x': '-100%', scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: 'loop',
    repeatDelay: 1,
    type: 'spring',
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: 'spring',
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const ShinyButton = React.forwardRef(function ShinyButton(
  { children, className = '', href, target, rel, ...props },
  ref
) {
  const Comp = href ? motion.a : motion.button
  const reduced = prefersReducedMotion()
  const motionOpts = reduced
    ? { initial: { scale: 1 }, animate: { scale: 1 } }
    : animationProps

  return (
    <Comp
      ref={ref}
      href={href}
      target={target}
      rel={rel}
      className={`shiny-button ${className}`.trim()}
      {...motionOpts}
      {...props}
    >
      <span className="shiny-button__label">{children}</span>
      <span className="shiny-button__shine" aria-hidden="true" />
    </Comp>
  )
})

ShinyButton.displayName = 'ShinyButton'

export default ShinyButton
