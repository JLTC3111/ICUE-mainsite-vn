import { Suspense, useEffect } from 'react'
import RecoveryBoundary, { RecoveryNotice } from './RecoveryBoundary.jsx'
import { installMediaRecovery } from './mediaRecovery.js'

export default function AppRecovery({ children }) {
  useEffect(() => installMediaRecovery(), [])
  return (
    <RecoveryBoundary allowReload>
      <Suspense fallback={<RecoveryNotice loading />}>{children}</Suspense>
    </RecoveryBoundary>
  )
}
