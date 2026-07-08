import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './WordRotate.css'

/**
 * Magic UI Word Rotate
 * @see https://magicui.design/docs/components/word-rotate
 */
export function WordRotate({
  words,
  duration = 2500,
  motionProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  className = '',
  as: As = 'span',
}) {
  const [index, setIndex] = useState(0)
  const MotionTag = motion[As] || motion.span

  useEffect(() => {
    if (!words?.length) return undefined
    setIndex(0)
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length)
    }, duration)
    return () => clearInterval(interval)
  }, [words, duration])

  if (!words?.length) return null

  return (
    <div className="word-rotate">
      <AnimatePresence mode="wait">
        <MotionTag
          key={words[index]}
          className={`word-rotate__word ${className}`.trim()}
          {...motionProps}
        >
          {words[index]}
        </MotionTag>
      </AnimatePresence>
    </div>
  )
}
