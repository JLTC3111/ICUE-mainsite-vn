import { lazy, Suspense, useEffect, useState } from 'react'

const ContactSidebar = lazy(() => import('./ContactSidebar.jsx'))

/** Keep the floating utility rail from competing with the page's first paint. */
export default function DeferredContactSidebar({ idleTimeout = 1600, ...props }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reveal = () => setReady(true)
    const handle = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(reveal, { timeout: idleTimeout })
      : window.setTimeout(reveal, 200)

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(handle)
      } else {
        window.clearTimeout(handle)
      }
    }
  }, [idleTimeout])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <ContactSidebar {...props} />
    </Suspense>
  )
}
