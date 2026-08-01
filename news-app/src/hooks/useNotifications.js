import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  dismissNotification,
  fetchNotifications,
  fetchUnreadCount,
  isMissingNotificationsSchema,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '../lib/notifications'

// Unread count refresh cadence. Realtime handles the common case; this is the
// fallback for projects where Realtime is off and for tabs that were asleep.
const POLL_MS = 90_000

/**
 * Notification state for the signed-in user: the list, the unread count, and
 * read/dismiss actions. `available` goes false when the notifications migration
 * has not been applied, so the bell can hide rather than error.
 *
 * Assumes the consumer is keyed by account (see NotificationBell in Header), so
 * everything here can treat the user id as fixed for the component's lifetime.
 */
export default function useNotifications() {
  const { user, isAuthed } = useAuth()
  const userId = user?.id ?? null

  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [available, setAvailable] = useState(true)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const countRequestRef = useRef(null)
  const pendingReadIdsRef = useRef(new Set())
  const pendingDismissIdsRef = useRef(new Set())
  const markAllPendingRef = useRef(false)
  const pendingMutationCountRef = useRef(0)
  const reconcileNeededRef = useRef(false)
  const mutationVersionRef = useRef(0)

  const handleError = useCallback((e) => {
    if (isMissingNotificationsSchema(e)) {
      setAvailable(false)
      return
    }
    console.warn('[notifications]', e)
    setError(true)
  }, [])

  const refreshCount = useCallback(async () => {
    if (!userId) return
    if (pendingMutationCountRef.current > 0) return
    if (countRequestRef.current) return countRequestRef.current

    const mutationVersion = mutationVersionRef.current
    const request = fetchUnreadCount()
    countRequestRef.current = request
    try {
      const nextCount = await request
      if (
        pendingMutationCountRef.current > 0
        || mutationVersion !== mutationVersionRef.current
      ) {
        return
      }
      setUnreadCount(nextCount)
      setError(false)
    } catch (e) {
      handleError(e)
    } finally {
      if (countRequestRef.current === request) countRequestRef.current = null
    }
  }, [userId, handleError])

  const refreshList = useCallback(async function refreshListSnapshot({ ensureFresh = false } = {}) {
    if (!userId) return
    if (pendingMutationCountRef.current > 0) {
      if (ensureFresh) reconcileNeededRef.current = true
      return
    }

    const mutationVersion = mutationVersionRef.current
    setLoading(true)
    try {
      const [rows, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()])
      if (
        pendingMutationCountRef.current > 0
        || mutationVersion !== mutationVersionRef.current
      ) {
        if (ensureFresh) {
          await new Promise((resolve) => window.setTimeout(resolve, 0))
          return refreshListSnapshot({ ensureFresh: true })
        }
        return
      }
      setItems(rows)
      setUnreadCount(count)
      setError(false)
      setLoadedOnce(true)
    } catch (e) {
      handleError(e)
    } finally {
      setLoading(false)
    }
  }, [userId, handleError])

  useEffect(() => {
    if (!isAuthed || !userId || !available) return undefined

    // Prime the badge from the server, then keep it in sync. refreshCount only
    // writes state after awaiting the query, so this is not a render cascade.
    refreshCount()

    let timer = null

    const stopPolling = () => {
      if (timer !== null) window.clearInterval(timer)
      timer = null
    }

    const startPolling = () => {
      stopPolling()
      if (document.visibilityState === 'visible') {
        timer = window.setInterval(refreshCount, POLL_MS)
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshCount()
        startPolling()
      } else {
        stopPolling()
      }
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') refreshCount()
    }

    startPolling()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    const unsubscribe = subscribeToNotifications(userId, (row) => {
      mutationVersionRef.current += 1
      setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]))
      if (!row.readAt) setUnreadCount((n) => n + 1)
    })

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      unsubscribe()
    }
  }, [isAuthed, userId, available, refreshCount])

  const finishMutation = useCallback((needsReconcile) => {
    pendingMutationCountRef.current = Math.max(0, pendingMutationCountRef.current - 1)
    mutationVersionRef.current += 1
    if (needsReconcile) reconcileNeededRef.current = true

    if (pendingMutationCountRef.current === 0 && reconcileNeededRef.current) {
      reconcileNeededRef.current = false
      void refreshList({ ensureFresh: true })
    }
  }, [refreshList])

  const markRead = useCallback(async (id, wasUnread) => {
    if (!wasUnread || pendingReadIdsRef.current.has(id)) return
    pendingReadIdsRef.current.add(id)
    pendingMutationCountRef.current += 1
    mutationVersionRef.current += 1

    const target = new Date().toISOString()
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: target } : n)),
    )
    setUnreadCount((n) => Math.max(0, n - 1))
    let failed = false
    try {
      await markNotificationRead(id)
    } catch (e) {
      handleError(e)
      failed = true
    } finally {
      pendingReadIdsRef.current.delete(id)
      finishMutation(failed)
    }
  }, [finishMutation, handleError])

  const markAllRead = useCallback(async () => {
    if (markAllPendingRef.current) return
    markAllPendingRef.current = true
    pendingMutationCountRef.current += 1
    mutationVersionRef.current += 1
    const target = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: target })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch (e) {
      handleError(e)
    } finally {
      markAllPendingRef.current = false
      // Reconcile even on success: an INSERT can race the set-wide RPC and
      // Realtime only reports the INSERT, not the subsequent read_at update.
      finishMutation(true)
    }
  }, [finishMutation, handleError])

  const dismiss = useCallback(async (id, wasUnread) => {
    if (pendingDismissIdsRef.current.has(id)) return
    pendingDismissIdsRef.current.add(id)
    pendingMutationCountRef.current += 1
    mutationVersionRef.current += 1

    setItems((prev) => prev.filter((n) => n.id !== id))
    if (wasUnread) setUnreadCount((n) => Math.max(0, n - 1))
    let failed = false
    try {
      await dismissNotification(id)
    } catch (e) {
      handleError(e)
      failed = true
    } finally {
      pendingDismissIdsRef.current.delete(id)
      finishMutation(failed)
    }
  }, [finishMutation, handleError])

  return {
    items,
    unreadCount,
    loading,
    error,
    available,
    loadedOnce,
    refreshList,
    markRead,
    markAllRead,
    dismiss,
  }
}
