import { useEffect, useMemo, useRef } from 'react'
import { animate, useMotionValue } from 'motion/react'
import usePrefersReducedMotion from '../../../../shared/ui/usePrefersReducedMotion.js'

// React Bits CountUp (2026-10-20): duration-based counts and explicit decimals.
// Preserve Our Work's shared visibility pass and its single gradient text node.
// https://reactbits.dev/text-animations/count-up
export default function CountUp({
  to, from = 0, direction = 'up', delay = 0, duration = 2, className = '',
  startWhen = true, separator = '', prefix = '', suffix = '', locale = 'en-US',
  decimals, onStart, onEnd,
}) {
  const ref = useRef(null)
  const current = useMotionValue(direction === 'down' ? to : from)
  const reduceMotion = usePrefersReducedMotion()
  const target = direction === 'down' ? from : to
  const callbacks = useRef({ onStart, onEnd })
  callbacks.current = { onStart, onEnd }
  const formatValue = useMemo(() => {
    const placesIn = number => {
      const [mantissa, exponent = '0'] = String(number).toLowerCase().split('e')
      return Math.max(0, (mantissa.split('.')[1]?.length || 0) - Number(exponent))
    }
    const places = Math.min(20, Math.max(0, decimals ?? Math.max(placesIn(from), placesIn(to))))
    const format = new Intl.NumberFormat(locale, {
      useGrouping: Boolean(separator), minimumFractionDigits: places, maximumFractionDigits: places,
    })
    return value => `${prefix}${format.formatToParts(value).map(part => part.type === 'group' ? separator : part.value).join('')}${suffix}`
  }, [from, to, locale, separator, prefix, suffix, decimals])

  useEffect(() => {
    if (ref.current) ref.current.textContent = formatValue(reduceMotion ? target : current.get())
    return current.on('change', value => {
      if (ref.current) ref.current.textContent = formatValue(value)
    })
  }, [current, formatValue, reduceMotion, target])

  useEffect(() => {
    if (reduceMotion) { current.set(target); return undefined }
    if (!startWhen) return undefined
    let controls
    const timer = setTimeout(() => {
      callbacks.current.onStart?.()
      controls = animate(current, target, {
        duration: Math.max(0, duration), ease: [0.22, 1, 0.36, 1],
        onComplete: () => { current.set(target); callbacks.current.onEnd?.() },
      })
    }, Math.max(0, delay) * 1000)
    return () => { clearTimeout(timer); controls?.stop() }
  }, [startWhen, reduceMotion, current, target, delay, duration])

  return <span className={className} ref={ref} aria-label={formatValue(target)} />
}
