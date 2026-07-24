import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import SlidingNumber from './magicui/SlidingNumber'
import { useElapsedMs } from '../hooks/useElapsedMs'
import './TranslateElapsedPill.css'

/**
 * Compact pill that counts elapsed ms while translation (or similar) is active.
 * Ported from hr_software FetchElapsedPill for newsroom AI Assist / translate UX.
 */
export default function TranslateElapsedPill({
  active,
  label,
  readyLabel,
  lingerMs = 1100,
  className = '',
}) {
  const { t } = useTranslation()
  const busyLabel = label ?? t('translate.translating')
  const doneLabel = readyLabel ?? t('translate.ready')
  const msLabel = t('translate.ms')

  const elapsedMs = useElapsedMs(active)
  const latestMsRef = useRef(0)
  const wasActiveRef = useRef(false)
  const [visible, setVisible] = useState(false)
  const [displayMs, setDisplayMs] = useState(0)

  useEffect(() => {
    if (active) {
      latestMsRef.current = elapsedMs
      setDisplayMs(elapsedMs)
    }
  }, [active, elapsedMs])

  useEffect(() => {
    if (active) {
      wasActiveRef.current = true
      setVisible(true)
      return undefined
    }

    if (!wasActiveRef.current) return undefined

    setDisplayMs(latestMsRef.current)
    const timer = setTimeout(() => {
      setVisible(false)
      wasActiveRef.current = false
    }, lingerMs)

    return () => clearTimeout(timer)
  }, [active, lingerMs])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.span
          key="translate-elapsed-pill"
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -2, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          aria-busy={active}
          className={`translate-elapsed-pill${className ? ` ${className}` : ''}`}
        >
          {active ? (
            <Loader className="translate-elapsed-pill__spinner" aria-hidden size={12} strokeWidth={2.5} />
          ) : (
            <span className="translate-elapsed-pill__dot" aria-hidden />
          )}
          <span className="translate-elapsed-pill__label">
            {active ? busyLabel : doneLabel}
          </span>
          <span className="translate-elapsed-pill__ms">
            <SlidingNumber value={displayMs} className="translate-elapsed-pill__number" />
            <span className="translate-elapsed-pill__unit">{msLabel}</span>
          </span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}
