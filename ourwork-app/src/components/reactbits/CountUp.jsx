import { useEffect, useMemo, useRef } from 'react'
import { useMotionValue, useSpring } from 'motion/react'

/**
 * React Bits CountUp — adapted for ICUE.
 * @see https://reactbits.dev/text-animations/count-up
 *
 * Three deliberate changes from upstream:
 *
 *   1. No `useInView`. useOurWorkMotion documents why this page must not run an
 *      IntersectionObserver at all; the caller gates on `startWhen`, fed from
 *      the same single rAF pass that reveals everything else.
 *   2. `prefix`/`suffix` are written into the number's own text node rather
 *      than sibling spans, so the value stays one text run — `.ow-stat__n` is
 *      `width: fit-content` under a background-clip:text gradient, and a
 *      separate span for "+" would sit outside the measured box.
 *   3. Reduced motion paints the final value and never starts the spring.
 *
 * Like `.is-revealed`, textContent is written imperatively. That is safe here
 * because React renders this span with no children and never rewrites it.
 */
export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  prefix = '',
  suffix = '',
  locale = 'en-US',
  onStart,
  onEnd,
}) {
  const ref = useRef(null)
  const motionValue = useMotionValue(direction === 'down' ? to : from)

  const springValue = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  })

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const formatValue = useMemo(() => {
    const decimalsIn = (num) => {
      const decimals = String(num).split('.')[1]
      return decimals && parseInt(decimals, 10) !== 0 ? decimals.length : 0
    }
    const maxDecimals = Math.max(decimalsIn(from), decimalsIn(to))
    const format = new Intl.NumberFormat(locale, {
      useGrouping: Boolean(separator),
      minimumFractionDigits: maxDecimals,
      maximumFractionDigits: maxDecimals,
    })
    return (latest) => {
      const n = format.format(latest)
      return `${prefix}${separator ? n.replace(/,/g, separator) : n}${suffix}`
    }
  }, [from, to, locale, separator, prefix, suffix])

  // Paint whatever the spring currently holds — `from` before the count is
  // started, the settled figure after. Upstream repaints `from` here instead,
  // which is fine when `to` never changes but wrong for us: `formatValue` is
  // rebuilt on every language switch, and a visitor who flips locale after the
  // band has counted would watch all four figures snap back to 0 with no
  // spring left to run. Reduced motion has no spring at all, so it reads `to`.
  useEffect(() => {
    if (!ref.current) return
    ref.current.textContent = formatValue(reduceMotion ? to : springValue.get())
  }, [formatValue, reduceMotion, to, springValue])

  useEffect(() => {
    if (!startWhen || reduceMotion) return undefined

    onStart?.()
    const startId = setTimeout(() => {
      motionValue.set(direction === 'down' ? from : to)
    }, delay * 1000)
    const endId = setTimeout(() => onEnd?.(), (delay + duration) * 1000)

    return () => {
      clearTimeout(startId)
      clearTimeout(endId)
    }
    // onStart/onEnd are intentionally excluded: callers pass inline callbacks,
    // and re-running this effect would restart the count mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWhen, reduceMotion, motionValue, direction, from, to, delay, duration])

  useEffect(() => {
    if (reduceMotion) return undefined
    return springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = formatValue(latest)
    })
  }, [springValue, formatValue, reduceMotion])

  return <span className={className} ref={ref} />
}
