import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LatticeLoader from '../../../shared/ui/LatticeLoader.jsx'
import './TranslateElapsedPill.css'

/** Keep the completed translation time briefly visible after its work finishes. */
export default function TranslateElapsedPill({ active, label, readyLabel, lingerMs = 1100, className = '' }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    if (active) {
      wasActiveRef.current = true
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    if (!wasActiveRef.current) return undefined
    const timer = setTimeout(() => {
      setVisible(false)
      wasActiveRef.current = false
    }, lingerMs)
    return () => clearTimeout(timer)
  }, [active, lingerMs])

  if (!active && !visible) return null

  return (
    <span className={`translate-elapsed-pill${className ? ` ${className}` : ''}`}>
      <LatticeLoader
        status={active ? 'working' : 'done'}
        label={label ?? t('translate.translating')}
        doneLabel={readyLabel ?? t('translate.ready')}
        compact
        inline
      />
    </span>
  )
}
