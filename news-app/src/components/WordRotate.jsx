import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Magic UI Word Rotate, adapted to the newsroom's plain-CSS component setup.
 *
 * The public API mirrors Magic UI's component: words, duration, className and
 * motionProps. It intentionally renders spans instead of headings so callers
 * can place it inside the page's semantic h1 without creating invalid markup.
 */
export function WordRotate({
  words = [],
  duration = 2500,
  motionProps = {
    initial: { opacity: 0, y: -36 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 36 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  className = '',
}) {
  const safeWords = useMemo(
    () => words.filter((word) => typeof word === 'string' && word.trim()),
    [words],
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (safeWords.length < 2) return undefined

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeWords.length)
    }, duration)

    return () => window.clearInterval(interval)
  }, [duration, safeWords])

  if (safeWords.length === 0) return null

  const currentWord = safeWords[index % safeWords.length]

  return (
    <span
      className={`word-rotate${className ? ` ${className}` : ''}`}
      aria-label={safeWords.join(', ')}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${index}-${currentWord}`}
          className="word-rotate__word"
          aria-hidden="true"
          {...motionProps}
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default WordRotate
