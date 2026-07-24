import { Children, memo, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './TextLoop.css'

/**
 * motion-primitives Text Loop
 * @see https://motion-primitives.com/docs/text-loop
 */
function TextLoopComponent({
  children,
  className = '',
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
  trigger = true,
  mode = 'popLayout',
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const items = Children.toArray(children)

  useEffect(() => {
    if (!trigger || items.length <= 1) return undefined

    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        const next = (current + 1) % items.length
        onIndexChange?.(next)
        return next
      })
    }, interval * 1000)

    return () => clearInterval(timer)
  }, [items.length, interval, onIndexChange, trigger])

  const motionVariants = variants || {
    initial: { y: 16, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -16, opacity: 0 },
  }

  if (!items.length) return null

  return (
    <span className={`text-loop${className ? ` ${className}` : ''}`}>
      <AnimatePresence mode={mode} initial={false}>
        <motion.span
          key={currentIndex}
          className="text-loop__item"
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          variants={motionVariants}
        >
          {items[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export const TextLoop = memo(TextLoopComponent)
