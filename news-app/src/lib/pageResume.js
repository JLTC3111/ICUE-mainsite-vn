export const PAGE_RESUME_MIN_HIDDEN_MS = 30_000
const PAGE_RESUME_DEDUPE_MS = 1_000

/**
 * Subscribe to browser lifecycle signals that indicate a suspended page is
 * usable again. Mobile browsers may freeze an in-flight request while the tab
 * is backgrounded, and bfcache restores do not remount React components.
 */
export function subscribeToPageResume(
  onResume,
  {
    documentTarget = document,
    windowTarget = window,
    now = Date.now,
    minHiddenMs = PAGE_RESUME_MIN_HIDDEN_MS,
  } = {},
) {
  let hiddenAt = documentTarget.hidden ? now() : null
  let lastResumeAt = Number.NEGATIVE_INFINITY

  const markHidden = () => {
    if (hiddenAt === null) hiddenAt = now()
  }

  const resume = (reason, force = false) => {
    if (documentTarget.hidden) return

    const resumedAt = now()
    const hiddenFor = hiddenAt === null ? null : Math.max(0, resumedAt - hiddenAt)
    hiddenAt = null

    if (!force && (hiddenFor === null || hiddenFor < minHiddenMs)) return
    // A reconnect is a distinct recovery signal: do not suppress it just
    // because the page became visible moments before connectivity returned.
    if (reason !== 'online' && resumedAt - lastResumeAt < PAGE_RESUME_DEDUPE_MS) return

    lastResumeAt = resumedAt
    onResume({ reason, hiddenFor })
  }

  const onVisibilityChange = () => {
    if (documentTarget.hidden) markHidden()
    else resume('visibilitychange')
  }
  const onPageShow = (event) => resume('pageshow', Boolean(event.persisted))
  const onFocus = () => resume('focus')
  const onOnline = () => resume('online', true)

  documentTarget.addEventListener('visibilitychange', onVisibilityChange)
  windowTarget.addEventListener('pagehide', markHidden)
  windowTarget.addEventListener('pageshow', onPageShow)
  windowTarget.addEventListener('focus', onFocus)
  windowTarget.addEventListener('online', onOnline)

  return () => {
    documentTarget.removeEventListener('visibilitychange', onVisibilityChange)
    windowTarget.removeEventListener('pagehide', markHidden)
    windowTarget.removeEventListener('pageshow', onPageShow)
    windowTarget.removeEventListener('focus', onFocus)
    windowTarget.removeEventListener('online', onOnline)
  }
}
