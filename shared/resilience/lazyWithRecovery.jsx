import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import RecoveryBoundary, { RecoveryNotice } from './RecoveryBoundary.jsx'
import { withDeadline } from './requests.js'

/** Retrying creates a fresh React.lazy instance; rejected promises are cached by React. */
export function lazyWithRecovery(importer, { optional = false, recoverDocument = false } = {}) {
  return function RecoverableComponent(props) {
    const id = useId()
    const active = useRef(true)
    const version = useRef(0)
    const [attempt, setAttempt] = useState(0)
    useEffect(() => {
      active.current = true
      return () => {
        active.current = false
        // StrictMode reconnects effects immediately; only settle a real exit.
        Promise.resolve().then(() => {
          if (recoverDocument && !active.current) window.dispatchEvent(new CustomEvent('icue:route-ready', { detail: id }))
        })
      }
    }, [id])
    const Loaded = useMemo(() => lazy(() => {
      const currentVersion = ++version.current
      const signal = (type) => {
        if (recoverDocument && active.current && currentVersion === version.current) {
          window.dispatchEvent(new CustomEvent(type, { detail: id }))
        }
      }
      signal('icue:route-loading')
      return withDeadline(importer).then(module => {
        signal('icue:route-ready')
        return module
      }).catch((cause) => {
        signal('icue:route-error')
        const error = new Error('Component download failed', { cause })
        error.code = 'ICUE_LOAD_ERROR'
        throw error
      })
    }), [attempt, id])
    return (
      <RecoveryBoundary key={attempt} onRetry={() => setAttempt((value) => value + 1)} compact={optional} allowReload={!optional}>
        <Suspense fallback={optional ? null : <RecoveryNotice loading />}>
          <Loaded {...props} />
        </Suspense>
      </RecoveryBoundary>
    )
  }
}
