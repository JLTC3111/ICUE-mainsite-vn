export const PAGE_RESUME_MIN_HIDDEN_MS = 30_000
const DEDUPE_MS = 1_000

/** Recover on a visible, connected page; retain signals received while hidden. */
export function subscribeToPageResume(onResume, {
  documentTarget = document,
  windowTarget = window,
  navigatorTarget = typeof navigator === 'undefined' ? null : navigator,
  now = Date.now,
  minHiddenMs = PAGE_RESUME_MIN_HIDDEN_MS,
} = {}) {
  let hiddenAt = documentTarget.hidden ? now() : null
  let pendingReason = null
  let lastResumeAt = -Infinity
  const markHidden = () => {
    if (hiddenAt === null) {
      hiddenAt = now()
      // A new trip to the background must not be deduplicated with the last one.
      lastResumeAt = -Infinity
    }
  }

  const resume = (reason, force = false) => {
    if (force) pendingReason = reason
    if (documentTarget.hidden || navigatorTarget?.onLine === false) return
    const resumedAt = now()
    const hiddenFor = hiddenAt === null ? null : Math.max(0, resumedAt - hiddenAt)
    const pending = pendingReason
    if (!pending && (hiddenFor === null || hiddenFor < minHiddenMs)) {
      hiddenAt = null
      return
    }
    if (pending !== 'online' && resumedAt - lastResumeAt < DEDUPE_MS) return
    hiddenAt = null
    pendingReason = null
    lastResumeAt = resumedAt
    onResume({ reason: pending || reason, hiddenFor })
  }
  const onVisibility = () => documentTarget.hidden ? markHidden() : resume('visibilitychange')
  const onPageShow = (event) => resume('pageshow', Boolean(event.persisted))
  const onFocus = () => resume('focus')
  const onOnline = () => resume('online', true)
  const onDocumentResume = () => resume('resume', true)

  documentTarget.addEventListener('visibilitychange', onVisibility)
  documentTarget.addEventListener('freeze', markHidden)
  documentTarget.addEventListener('resume', onDocumentResume)
  windowTarget.addEventListener('pagehide', markHidden)
  windowTarget.addEventListener('pageshow', onPageShow)
  windowTarget.addEventListener('focus', onFocus)
  windowTarget.addEventListener('online', onOnline)
  return () => {
    documentTarget.removeEventListener('visibilitychange', onVisibility)
    documentTarget.removeEventListener('freeze', markHidden)
    documentTarget.removeEventListener('resume', onDocumentResume)
    windowTarget.removeEventListener('pagehide', markHidden)
    windowTarget.removeEventListener('pageshow', onPageShow)
    windowTarget.removeEventListener('focus', onFocus)
    windowTarget.removeEventListener('online', onOnline)
  }
}
