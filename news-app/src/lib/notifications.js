import { supabase } from './supabase'

// Bell notifications for admins + authors. Rows are written exclusively by the
// database triggers in supabase/schema.sql; the client reads its own rows (RLS)
// and changes read state through SECURITY DEFINER RPCs.

export const NOTIFICATION_TYPES = [
  'article_published',
  'article_deleted',
  'views_milestone',
  'hearts_milestone',
  'claps_milestone',
]

const NOTIFICATION_SELECT =
  'id, type, article_id, article_slug, article_title, actor_id, actor_name, threshold, read_at, created_at'

/**
 * True when the notifications migration has not been applied to this project.
 * Callers hide the bell instead of surfacing an error — the rest of the
 * newsroom works fine without it.
 */
export function isMissingNotificationsSchema(error) {
  if (!error) return false
  const code = error.code
  if (code === '42P01' || code === 'PGRST202' || code === 'PGRST205') return true
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  return msg.includes('notification') && (msg.includes('does not exist') || msg.includes('not find'))
}

function normalize(row) {
  return {
    id: row.id,
    type: row.type,
    articleId: row.article_id ?? null,
    articleSlug: row.article_slug ?? null,
    articleTitle: row.article_title ?? '',
    actorId: row.actor_id ?? null,
    actorName: row.actor_name ?? '',
    threshold: row.threshold ?? null,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  }
}

/** An article link only makes sense while the article still exists. */
export function notificationLink(notification) {
  if (!notification?.articleSlug) return null
  if (notification.type === 'article_deleted') return null
  return `/article/${notification.articleSlug}`
}

export async function fetchNotifications({ limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('newsroom_notifications')
    .select(NOTIFICATION_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from('newsroom_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markNotificationRead(id) {
  const { error } = await supabase.rpc('mark_newsroom_notification_read', { p_id: id })
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc('mark_all_newsroom_notifications_read')
  if (error) throw error
  return Number(data) || 0
}

export async function dismissNotification(id) {
  const { error } = await supabase.rpc('dismiss_newsroom_notification', { p_id: id })
  if (error) throw error
}

/**
 * Live updates for one recipient. Returns an unsubscribe function; a no-op when
 * Realtime is unavailable (unconfigured client), in which case the caller's
 * polling keeps the bell current.
 */
export function subscribeToNotifications(recipientId, onInsert) {
  if (!recipientId || typeof supabase.channel !== 'function') return () => {}

  let channel
  try {
    channel = supabase
      .channel(`notifications:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'newsroom_notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => {
          if (payload?.new) onInsert(normalize(payload.new))
        },
      )
      .subscribe()
  } catch (e) {
    console.warn('[notifications] Realtime unavailable, falling back to polling:', e)
    return () => {}
  }

  return () => {
    try {
      supabase.removeChannel(channel)
    } catch {
      channel?.unsubscribe?.()
    }
  }
}
