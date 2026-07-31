import { useCallback, useEffect, useState } from 'react'
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
    try {
      setUnreadCount(await fetchUnreadCount())
      setError(false)
    } catch (e) {
      handleError(e)
    }
  }, [userId, handleError])

  const refreshList = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [rows, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()])
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCount()

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount()
    }
    const timer = window.setInterval(refreshCount, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refreshCount)

    const unsubscribe = subscribeToNotifications(userId, (row) => {
      setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]))
      if (!row.readAt) setUnreadCount((n) => n + 1)
    })

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refreshCount)
      unsubscribe()
    }
  }, [isAuthed, userId, available, refreshCount])

  const markRead = useCallback(async (id) => {
    const target = new Date().toISOString()
    let wasUnread = false
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id || n.readAt) return n
        wasUnread = true
        return { ...n, readAt: target }
      }),
    )
    if (!wasUnread) return
    setUnreadCount((n) => Math.max(0, n - 1))
    try {
      await markNotificationRead(id)
    } catch (e) {
      handleError(e)
      refreshCount()
    }
  }, [handleError, refreshCount])

  const markAllRead = useCallback(async () => {
    const target = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: target })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch (e) {
      handleError(e)
      refreshCount()
    }
  }, [handleError, refreshCount])

  const dismiss = useCallback(async (id) => {
    let wasUnread = false
    setItems((prev) =>
      prev.filter((n) => {
        if (n.id !== id) return true
        wasUnread = !n.readAt
        return false
      }),
    )
    if (wasUnread) setUnreadCount((n) => Math.max(0, n - 1))
    try {
      await dismissNotification(id)
    } catch (e) {
      handleError(e)
      refreshList()
    }
  }, [handleError, refreshList])

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
