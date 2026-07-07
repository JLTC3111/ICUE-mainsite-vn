import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useMemo } from 'react'
import './Counter.css'

function CounterRoll({ mv, digit, height }) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10
    let offset = (10 + digit - placeValue) % 10
    let memo = offset * height
    if (offset > 5) memo -= 10 * height
    return memo
  })

  return (
    <motion.span className="counter-number" style={{ y }}>
      {digit}
    </motion.span>
  )
}

function Digit({ place, value, height, digitStyle }) {
  if (place === '.') {
    return (
      <span className="counter-digit" style={{ width: 'auto', ...digitStyle }}>
        .
      </span>
    )
  }

  const valueRoundedToPlace = Math.floor(value / place)
  const animatedValue = useSpring(valueRoundedToPlace)

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace)
  }, [animatedValue, valueRoundedToPlace])

  return (
    <span className="counter-digit" style={{ height, lineHeight: `${height}px`, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <CounterRoll key={i} mv={animatedValue} digit={i} height={height} />
      ))}
    </span>
  )
}

function buildPlaces(value) {
  const str = String(value ?? 0)
  const chars = [...str]
  const dotIndex = str.indexOf('.')

  return chars.map((ch, i) => {
    if (ch === '.') return '.'
    const isInteger = dotIndex === -1
    const exponent = isInteger
      ? str.length - i - 1
      : i < dotIndex
        ? dotIndex - i - 1
        : -(i - dotIndex)
    return 10 ** exponent
  })
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places: placesProp,
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = 'inherit',
  fontWeight = 'inherit',
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = 'black',
  gradientTo = 'transparent',
  topGradientStyle,
  bottomGradientStyle,
  showGradient = true,
}) {
  const numericValue = Number.isFinite(value) ? value : 0
  const places = useMemo(
    () => placesProp ?? buildPlaces(numericValue),
    [placesProp, numericValue],
  )
  const height = fontSize + padding
  const defaultCounterStyle = {
    fontSize,
    gap,
    borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    color: textColor,
    fontWeight,
    height,
    lineHeight: `${height}px`,
  }
  const defaultTopGradientStyle = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
  }
  const defaultBottomGradientStyle = {
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
  }

  return (
    <span className="counter-container" style={containerStyle}>
      <span className="counter-counter" style={{ ...defaultCounterStyle, ...counterStyle }}>
        {places.map((place, index) => (
          <Digit
            key={`${place}-${index}`}
            place={place}
            value={numericValue}
            height={height}
            digitStyle={digitStyle}
          />
        ))}
      </span>
      {showGradient && (
        <span className="gradient-container" aria-hidden="true">
          <span className="top-gradient" style={topGradientStyle ?? defaultTopGradientStyle} />
          <span className="bottom-gradient" style={bottomGradientStyle ?? defaultBottomGradientStyle} />
        </span>
      )}
    </span>
  )
}
