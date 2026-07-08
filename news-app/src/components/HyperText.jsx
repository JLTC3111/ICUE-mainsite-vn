import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './HyperText.css'

const DEFAULT_CHARACTER_SET = Object.freeze(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
)

const motionElements = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  span: motion.span,
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function splitIntoCharacters(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), (segment) => segment.segment)
  }
  return Array.from(text)
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

function scrambleText(text, characterSet) {
  return splitIntoCharacters(text).map((letter) =>
    letter === ' ' ? letter : characterSet[getRandomInt(characterSet.length)]
  )
}

export default function HyperText({
  children,
  className,
  duration = 800,
  delay = 0,
  as: Component = 'div',
  startOnView = false,
  animateOnHover = true,
  characterSet = DEFAULT_CHARACTER_SET,
  ...props
}) {
  const MotionComponent = motionElements[Component] || motion.div
  const [displayText, setDisplayText] = useState(() => scrambleText(children, characterSet))
  const [isAnimating, setIsAnimating] = useState(false)
  const iterationCount = useRef(0)
  const elementRef = useRef(null)
  const targetChars = useRef(splitIntoCharacters(children))

  const beginAnimation = () => {
    targetChars.current = splitIntoCharacters(children)
    iterationCount.current = 0
    setDisplayText(scrambleText(children, characterSet))
    setIsAnimating(true)
  }

  useEffect(() => {
    targetChars.current = splitIntoCharacters(children)
    iterationCount.current = 0
    setDisplayText(scrambleText(children, characterSet))
    setIsAnimating(false)
  }, [children, characterSet])

  useEffect(() => {
    if (!startOnView) {
      const startTimeout = setTimeout(beginAnimation, delay)
      return () => clearTimeout(startTimeout)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(beginAnimation, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '-30% 0px -30% 0px' }
    )

    const node = elementRef.current
    if (node) observer.observe(node)

    return () => observer.disconnect()
  }, [children, delay, startOnView, characterSet])

  const handleAnimationTrigger = () => {
    if (animateOnHover && !isAnimating) {
      beginAnimation()
    }
  }

  useEffect(() => {
    let animationFrameId = null

    if (!isAnimating) return undefined

    const letters = targetChars.current
    const maxIterations = letters.length
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      iterationCount.current = progress * maxIterations

      setDisplayText(
        letters.map((letter, index) =>
          letter === ' '
            ? letter
            : index <= iterationCount.current
              ? letter
              : characterSet[getRandomInt(characterSet.length)]
        )
      )

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [duration, isAnimating, characterSet])

  return (
    <MotionComponent
      ref={elementRef}
      className={cn('hyper-text', className)}
      onMouseEnter={handleAnimationTrigger}
      {...props}
    >
      <AnimatePresence>
        {displayText.map((letter, index) => (
          <motion.span
            key={index}
            className={cn('hyper-text__char', letter === ' ' && 'hyper-text__char--space')}
          >
            {letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </MotionComponent>
  )
}
