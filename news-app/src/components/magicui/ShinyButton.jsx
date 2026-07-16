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

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Magic UI Shiny Button
 * @see https://magicui.design/docs/components/shiny-button
 */
export const ShinyButton = React.forwardRef(function ShinyButton(
  { children, className = '', ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      className={cn('shiny-button', className)}
      {...animationProps}
      {...props}
    >
      <span
        className="shiny-button__label"
        style={{
          maskImage:
            'linear-gradient(-75deg,var(--primary) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--primary) calc(var(--x) + 100%))',
          WebkitMaskImage:
            'linear-gradient(-75deg,var(--primary) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--primary) calc(var(--x) + 100%))',
        }}
      >
        {children}
      </span>
      <span
        className="shiny-button__shine"
        style={{
          mask: 'linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))',
          WebkitMask:
            'linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))',
          backgroundImage:
            'linear-gradient(-75deg,rgba(0,0,0,0.1) calc(var(--x) + 20%),rgba(0,0,0,0.5) calc(var(--x) + 25%),rgba(0,0,0,0.1) calc(var(--x) + 100%))',
        }}
        aria-hidden="true"
      />
    </motion.button>
  )
})

ShinyButton.displayName = 'ShinyButton'
