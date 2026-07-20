import { useEffect, useId, useMemo } from 'react'
import {
  motion,
  motionValue,
  useSpring,
  useTransform,
} from 'motion/react'
import useMeasure from 'react-use-measure'
import './SlidingNumber.css'

const DEFAULT_SPRING = {
  type: 'spring',
  stiffness: 280,
  damping: 18,
  mass: 0.3,
}

const SLOW_SPRING = {
  type: 'spring',
  stiffness: 110,
  damping: 24,
  mass: 0.65,
}

function SlidingDigit({ value, place, reduceMotion, spring }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10
  const initial = motionValue(valueRoundedToPlace)
  const springConfig = reduceMotion ? { duration: 0 } : spring
  const animatedValue = useSpring(initial, springConfig)

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace)
  }, [animatedValue, valueRoundedToPlace])

  if (reduceMotion) {
    return <span className="sliding-number__digit">{valueRoundedToPlace}</span>
  }

  return (
    <span className="sliding-number__digit">
      <span className="sliding-number__digit-spacer" aria-hidden>0</span>
      {Array.from({ length: 10 }, (_, i) => (
        <SlidingDigitFace key={i} mv={animatedValue} number={i} spring={spring} />
      ))}
    </span>
  )
}

function SlidingDigitFace({ mv, number, spring }) {
  const uniqueId = useId()
  const [ref, bounds] = useMeasure()

  const y = useTransform(mv, (latest) => {
    if (!bounds.height) return 0
    const placeValue = latest % 10
    const offset = (10 + number - placeValue) % 10
    let memo = offset * bounds.height
    if (offset > 5) memo -= 10 * bounds.height
    return memo
  })

  if (!bounds.height) {
    return (
      <span ref={ref} className="sliding-number__face sliding-number__face--measure">
        {number}
      </span>
    )
  }

  return (
    <motion.span
      ref={ref}
      style={{ y }}
      layoutId={`${uniqueId}-${number}`}
      className="sliding-number__face"
      transition={spring}
    >
      {number}
    </motion.span>
  )
}

export default function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = '.',
  reduceMotion = false,
  spring = DEFAULT_SPRING,
  className = '',
}) {
  const resolvedSpring = useMemo(
    () => (reduceMotion ? { duration: 0 } : spring),
    [reduceMotion, spring],
  )

  const absValue = Math.abs(value)
  const [integerPart, decimalPart] = absValue.toString().split('.')
  const integerValue = parseInt(integerPart, 10)
  const paddedInteger =
    padStart && integerValue < 10 ? `0${integerPart}` : integerPart
  const integerDigits = paddedInteger.split('')
  const integerPlaces = integerDigits.map((_, i) => (
    10 ** (integerDigits.length - i - 1)
  ))

  return (
    <span className={`sliding-number${className ? ` ${className}` : ''}`}>
      {value < 0 && '-'}
      {integerDigits.map((_, index) => (
        <SlidingDigit
          key={`pos-${integerPlaces[index]}`}
          value={integerValue}
          place={integerPlaces[index]}
          reduceMotion={reduceMotion}
          spring={resolvedSpring}
        />
      ))}
      {decimalPart && (
        <>
          <span className="sliding-number__separator">{decimalSeparator}</span>
          {decimalPart.split('').map((_, index) => (
            <SlidingDigit
              key={`decimal-${index}`}
              value={parseInt(decimalPart, 10)}
              place={10 ** (decimalPart.length - index - 1)}
              reduceMotion={reduceMotion}
              spring={resolvedSpring}
            />
          ))}
        </>
      )}
    </span>
  )
}

export { DEFAULT_SPRING, SLOW_SPRING }
