import { useCallback, useEffect, useRef, useState } from 'react'
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
    // Grapheme clusters so Vietnamese base+tone marks stay one unit.
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(segmenter.segment(String(text ?? '')), (segment) => segment.segment)
  }
  return Array.from(String(text ?? ''))
}

/** Group graphemes into words so line wraps never split mid-word. */
function groupCharactersIntoWords(chars) {
  const groups = []
  let current = []
  let startIndex = 0
  let characterIndex = 0

  const flushWord = () => {
    if (!current.length) return
    groups.push({ type: 'word', chars: current, startIndex })
    current = []
  }

  for (const char of chars) {
    if (/\s/.test(char)) {
      flushWord()
      groups.push({ type: 'space', char, startIndex: characterIndex })
      characterIndex += 1
      startIndex = characterIndex
      continue
    }
    if (!current.length) startIndex = characterIndex
    current.push(char)
    characterIndex += 1
  }

  flushWord()
  return groups
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

function scrambleText(text, characterSet) {
  return splitIntoCharacters(text).map((letter) =>
    /\s/.test(letter) ? letter : characterSet[getRandomInt(characterSet.length)]
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
  reduceMotion = false,
  characterSet = DEFAULT_CHARACTER_SET,
  ...props
}) {
  const MotionComponent = motionElements[Component] || motion.div
  const [displayText, setDisplayText] = useState(() => (
    reduceMotion ? splitIntoCharacters(children) : scrambleText(children, characterSet)
  ))
  const [isAnimating, setIsAnimating] = useState(false)
  const iterationCount = useRef(0)
  const elementRef = useRef(null)
  const targetChars = useRef(splitIntoCharacters(children))

  const beginAnimation = useCallback(() => {
    if (reduceMotion) return
    targetChars.current = splitIntoCharacters(children)
    iterationCount.current = 0
    setDisplayText(scrambleText(children, characterSet))
    setIsAnimating(true)
  }, [characterSet, children, reduceMotion])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      targetChars.current = splitIntoCharacters(children)
      iterationCount.current = 0
      setDisplayText(
        reduceMotion
          ? splitIntoCharacters(children)
          : scrambleText(children, characterSet),
      )
      setIsAnimating(false)
    })
    return () => cancelAnimationFrame(frameId)
  }, [children, characterSet, reduceMotion])

  useEffect(() => {
    if (reduceMotion) return undefined

    if (!startOnView) {
      const startTimeout = setTimeout(beginAnimation, delay)
      return () => clearTimeout(startTimeout)
    }

    let startTimeout = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTimeout = setTimeout(beginAnimation, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '-30% 0px -30% 0px' }
    )

    const node = elementRef.current
    if (node) observer.observe(node)

    return () => {
      if (startTimeout !== null) clearTimeout(startTimeout)
      observer.disconnect()
    }
  }, [beginAnimation, delay, startOnView, reduceMotion])

  const handleAnimationTrigger = () => {
    if (!reduceMotion && animateOnHover && !isAnimating) {
      beginAnimation()
    }
  }

  useEffect(() => {
    let animationFrameId = null

    if (reduceMotion || !isAnimating) return undefined

    const letters = targetChars.current
    const maxIterations = letters.length
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      iterationCount.current = progress * maxIterations

      setDisplayText(
        letters.map((letter, index) =>
          /\s/.test(letter)
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
  }, [duration, isAnimating, characterSet, reduceMotion])

  if (reduceMotion) {
    const PlainComponent = Component
    return (
      <PlainComponent className={cn('hyper-text', className)} {...props}>
        {children}
      </PlainComponent>
    )
  }

  const wordGroups = groupCharactersIntoWords(displayText)

  return (
    <MotionComponent
      ref={elementRef}
      className={cn('hyper-text', className)}
      onMouseEnter={handleAnimationTrigger}
      {...props}
    >
      <AnimatePresence>
        {wordGroups.map((group, groupIndex) => {
          if (group.type === 'space') {
            return (
              <motion.span
                key={`space-${groupIndex}-${group.startIndex}`}
                className="hyper-text__char hyper-text__char--space"
              >
                {group.char}
              </motion.span>
            )
          }

          return (
            <span key={`word-${groupIndex}-${group.startIndex}`} className="hyper-text__word">
              {group.chars.map((letter, offset) => (
                <motion.span
                  key={`${group.startIndex + offset}`}
                  className="hyper-text__char"
                >
                  {letter}
                </motion.span>
              ))}
            </span>
          )
        })}
      </AnimatePresence>
    </MotionComponent>
  )
}
