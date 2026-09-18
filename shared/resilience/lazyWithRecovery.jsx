import { lazy, Suspense, useMemo, useState } from 'react'
import RecoveryBoundary, { RecoveryNotice } from './RecoveryBoundary.jsx'
import { withDeadline } from './requests.js'

/** Retrying creates a fresh React.lazy instance; rejected promises are cached by React. */
export function lazyWithRecovery(importer, { optional = false } = {}) {
  return function RecoverableComponent(props) {
    const [attempt, setAttempt] = useState(0)
    const Loaded = useMemo(() => lazy(() => withDeadline(importer).catch((cause) => {
      const error = new Error('Component download failed', { cause })
      error.code = 'ICUE_LOAD_ERROR'
      throw error
    })), [attempt])
    return (
      <RecoveryBoundary key={attempt} onRetry={() => setAttempt((value) => value + 1)} compact={optional} allowReload={!optional}>
        <Suspense fallback={optional ? null : <RecoveryNotice loading />}>
          <Loaded {...props} />
        </Suspense>
      </RecoveryBoundary>
    )
  }
}
