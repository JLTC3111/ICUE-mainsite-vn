import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * motion-primitives Text Scramble
 * @see https://motion-primitives.com/docs/text-scramble
 */
const DEFAULT_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = DEFAULT_CHARS,
  className = '',
  as: Component = 'span',
  trigger = true,
  onScrambleComplete,
  ...props
}) {
  const [displayText, setDisplayText] = useState(children)
  const isAnimatingRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()
  const text = String(children ?? '')

  useEffect(() => {
    if (!trigger || isAnimatingRef.current) return undefined

    if (prefersReducedMotion) {
      onScrambleComplete?.()
      return undefined
    }

    isAnimatingRef.current = true
    const steps = duration / speed
    let step = 0

    const interval = window.setInterval(() => {
      let scrambled = ''
      const progress = step / steps

      for (let i = 0; i < text.length; i += 1) {
        if (text[i] === ' ') {
          scrambled += ' '
          continue
        }
        if (progress * text.length > i) {
          scrambled += text[i]
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)]
        }
      }

      setDisplayText(scrambled)
      step += 1

      if (step > steps) {
        window.clearInterval(interval)
        setDisplayText(text)
        isAnimatingRef.current = false
        onScrambleComplete?.()
      }
    }, speed * 1000)

    return () => {
      window.clearInterval(interval)
      isAnimatingRef.current = false
    }
    // Only re-run when trigger/text/duration settings change; isAnimating is gated inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, text, duration, speed, characterSet, prefersReducedMotion])

  return (
    <Component className={className} {...props}>
      {prefersReducedMotion ? text : displayText}
    </Component>
  )
}
