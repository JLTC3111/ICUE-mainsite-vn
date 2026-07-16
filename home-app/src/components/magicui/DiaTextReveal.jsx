import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import './DiaTextReveal.css'

const DEFAULT_COLORS = ['#c679c4', '#fa3d1d', '#ffb005', '#e1e1fe', '#0358f7']
const BAND_HALF = 17
const SWEEP_START = -BAND_HALF
const SWEEP_END = 100 + BAND_HALF

const sweepEase = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

function buildGradient(pos, colors, textColor) {
  const bandStart = pos - BAND_HALF
  const bandEnd = pos + BAND_HALF

  if (bandStart >= 100) {
    return `linear-gradient(90deg, ${textColor}, ${textColor})`
  }
  const n = colors.length
  const parts = []

  if (bandStart > 0) {
    parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`)
  }

  colors.forEach((c, i) => {
    const pct = n === 1 ? pos : bandStart + (i / (n - 1)) * BAND_HALF * 2
    parts.push(`${c} ${pct.toFixed(2)}%`)
  })

  if (bandEnd < 100) {
    parts.push(`transparent ${bandEnd.toFixed(2)}%`, `transparent 100%`)
  }

  return `linear-gradient(90deg, ${parts.join(', ')})`
}

function measureWidths(el, texts) {
  const ghost = el.cloneNode()
  Object.assign(ghost.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    width: 'auto',
    whiteSpace: 'nowrap',
  })
  el.parentElement.appendChild(ghost)
  const widths = texts.map((t) => {
    ghost.textContent = t
    return ghost.getBoundingClientRect().width
  })
  ghost.remove()
  return widths
}

/**
 * Magic UI Dia Text Reveal
 * @see https://magicui.design/docs/components/dia-text-reveal
 */
export const DiaTextReveal = forwardRef(function DiaTextReveal({
  text,
  colors = DEFAULT_COLORS,
  textColor = '#0f172a',
  duration = 2.5,
  delay = 0.35,
  repeat = false,
  loop = false,
  repeatDelay = 4,
  startOnView = true,
  startOnHover = false,
  once = true,
  className = '',
  fixedWidth = false,
  ...props
}, ref) {
  const texts = Array.isArray(text) ? text : [text]
  const isMulti = texts.length > 1
  const shouldRepeat = repeat || loop
  const textKey = Array.isArray(text) ? text.join('\0') : text
  const prefersReducedMotion = useReducedMotion()

  const spanRef = useRef(null)
  const optsRef = useRef({
    colors,
    textColor,
    duration,
    delay,
    repeat: shouldRepeat,
    repeatDelay,
    texts,
  })
  optsRef.current = {
    colors,
    textColor,
    duration,
    delay,
    repeat: shouldRepeat,
    repeatDelay,
    texts,
  }

  const indexRef = useRef(0)
  const hasPlayedRef = useRef(false)
  const timerRef = useRef(undefined)
  const playRef = useRef(() => {})
  const stopRef = useRef(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const [measuredWidths, setMeasuredWidths] = useState([])

  // Hover mode: start fully revealed (base color). View mode: start at sweep origin.
  const sweepPos = useMotionValue(startOnHover ? SWEEP_END : SWEEP_START)
  const backgroundImage = useTransform(sweepPos, (pos) =>
    buildGradient(pos, optsRef.current.colors, optsRef.current.textColor),
  )

  const isInView = useInView(spanRef, { once, amount: 0.1 })

  useEffect(() => {
    const el = spanRef.current
    if (!el || !isMulti) return
    setMeasuredWidths(measureWidths(el, texts))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measure when text content changes
  }, [textKey, isMulti])

  playRef.current = () => {
    const opts = optsRef.current
    sweepPos.set(SWEEP_START)

    const controls = animate(sweepPos, SWEEP_END, {
      duration: opts.duration,
      delay: opts.delay,
      ease: sweepEase,
      onComplete() {
        if (!opts.repeat) return
        timerRef.current = setTimeout(() => {
          if (opts.texts.length > 1) {
            const next = (indexRef.current + 1) % opts.texts.length
            indexRef.current = next
            setActiveIndex(next)
          }
          playRef.current()
        }, opts.repeatDelay * 1000)
      },
    })

    stopRef.current = () => controls.stop()
  }

  const stopSweep = () => {
    stopRef.current?.()
    clearTimeout(timerRef.current)
  }

  const resetToIdle = () => {
    stopSweep()
    sweepPos.set(startOnHover ? SWEEP_END : SWEEP_START)
  }

  const handlePointerEnter = () => {
    if (!startOnHover || prefersReducedMotion) return
    stopSweep()
    playRef.current()
  }

  const handlePointerLeave = () => {
    if (!startOnHover) return
    resetToIdle()
  }

  useImperativeHandle(
    ref,
    () => ({
      play: handlePointerEnter,
      reset: handlePointerLeave,
    }),
    [startOnHover, prefersReducedMotion],
  )

  useEffect(() => {
    if (startOnHover) return undefined
    if (prefersReducedMotion) {
      sweepPos.set(SWEEP_END)
      return undefined
    }
    if (startOnView && !isInView) return undefined
    if (once && hasPlayedRef.current) return undefined
    hasPlayedRef.current = true
    playRef.current()

    return () => {
      stopSweep()
    }
  }, [isInView, startOnView, startOnHover, once, prefersReducedMotion, sweepPos])

  const fixedW =
    isMulti && fixedWidth && measuredWidths.length > 0
      ? Math.max(...measuredWidths)
      : undefined

  const animatedW =
    isMulti && !fixedWidth && measuredWidths[activeIndex] != null
      ? measuredWidths[activeIndex]
      : undefined

  if (prefersReducedMotion) {
    return (
      <span
        ref={spanRef}
        className={`dia-text-reveal ${className}`.trim()}
        style={{ color: textColor }}
        {...props}
      >
        {texts[activeIndex]}
      </span>
    )
  }

  return (
    <motion.span
      ref={spanRef}
      className={`dia-text-reveal${startOnHover ? ' dia-text-reveal--hover' : ''} ${className}`.trim()}
      style={{
        transform: 'translateY(-2px)',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        backgroundSize: '100% 100%',
        backgroundImage,
        ...(isMulti && {
          display: 'inline-block',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          ...(fixedW != null && { width: fixedW }),
        }),
      }}
      animate={animatedW != null ? { width: animatedW } : undefined}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onFocus={handlePointerEnter}
      onBlur={handlePointerLeave}
      {...props}
    >
      {texts[activeIndex]}
    </motion.span>
  )
})
