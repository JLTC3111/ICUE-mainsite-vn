import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, FileText, Trash2, X } from 'lucide-react'
import useNotifications from '../hooks/useNotifications'
import useClickOutside from '../hooks/useClickOutside'
import { formatRelativeTime } from '../lib/helpers'
import { notificationLink } from '../lib/notifications'
import DevIcon174 from './icons/DevIcon174'
import PhosphorHeart from './icons/PhosphorHeart'
import PhosphorHandsClapping from './icons/PhosphorHandsClapping'
import './NotificationBell.css'

const MAX_BADGE = 9

function TypeIcon({ type }) {
  const className = 'notif__type-icon'
  if (type === 'article_published') return <FileText className={className} aria-hidden="true" />
  if (type === 'article_deleted') return <Trash2 className={className} aria-hidden="true" />
  if (type === 'views_milestone') return <DevIcon174 className={className} />
  if (type === 'hearts_milestone') return <PhosphorHeart filled className={className} />
  if (type === 'claps_milestone') return <PhosphorHandsClapping filled className={className} />
  return <Bell className={className} aria-hidden="true" />
}

/**
 * Message for one notification. Publish/delete name the actor when someone else
 * did it; milestone events are visitor-driven and have no actor.
 */
function useNotificationMessage() {
  const { t } = useTranslation()

  return useCallback(
    (notification) => {
      const title = notification.articleTitle || t('notifications.untitled')
      const actor = notification.actorName
      const total = notification.threshold ?? 0

      switch (notification.type) {
        case 'article_published':
          return actor
            ? t('notifications.publishedBy', { actor, title })
            : t('notifications.published', { title })
        case 'article_deleted':
          return actor
            ? t('notifications.deletedBy', { actor, title })
            : t('notifications.deleted', { title })
        case 'views_milestone':
          return t('notifications.views', { title, total })
        case 'hearts_milestone':
          return t('notifications.hearts', { title, total })
        case 'claps_milestone':
          return t('notifications.claps', { title, total })
        default:
          return title
      }
    },
    [t],
  )
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const message = useNotificationMessage()

  const {
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
  } = useNotifications()

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Load the list lazily — anonymous-heavy sessions never pay for it.
  useEffect(() => {
    if (open) refreshList()
  }, [open, refreshList])

  const locale = i18n.resolvedLanguage || i18n.language || 'vi'
  const badge = useMemo(
    () => (unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : String(unreadCount)),
    [unreadCount],
  )

  const handleItemClick = useCallback(
    (notification) => {
      void markRead(notification.id, !notification.readAt)
      const link = notificationLink(notification)
      if (!link) return
      setOpen(false)
      navigate(link)
    },
    [markRead, navigate],
  )

  if (!available) return null

  const label = unreadCount > 0
    ? `${t('notifications.title')} — ${t('notifications.unread', { total: unreadCount })}`
    : t('notifications.title')

  return (
    <div className={`notif${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="notif__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="notif__bell" aria-hidden="true" />
        {unreadCount > 0 && <span className="notif__badge">{badge}</span>}
        <span className="notif__trigger-label">{t('notifications.title')}</span>
      </button>

      {open && (
        <div className="notif__panel" role="dialog" aria-label={t('notifications.title')}>
          <div className="notif__panel-head">
            <span className="notif__panel-title">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button type="button" className="notif__mark-all" onClick={markAllRead}>
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {error && <p className="notif__msg notif__msg--error">{t('notifications.loadError')}</p>}

          {loading && !loadedOnce && <p className="notif__msg">{t('notifications.loading')}</p>}

          {loadedOnce && !items.length && !error && (
            <p className="notif__msg">{t('notifications.empty')}</p>
          )}

          {items.length > 0 && (
            <ul className="notif__list">
              {items.map((notification) => {
                const isLink = Boolean(notificationLink(notification))
                return (
                  <li
                    key={notification.id}
                    className={`notif__item${notification.readAt ? '' : ' is-unread'}`}
                  >
                    <button
                      type="button"
                      className={`notif__item-main${isLink ? ' is-link' : ''}`}
                      onClick={() => handleItemClick(notification)}
                    >
                      <span className={`notif__type notif__type--${notification.type}`}>
                        <TypeIcon type={notification.type} />
                      </span>
                      <span className="notif__body">
                        <span className="notif__text">{message(notification)}</span>
                        <span className="notif__time">
                          {formatRelativeTime(notification.createdAt, locale)}
                        </span>
                      </span>
                      {!notification.readAt && <span className="notif__dot" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      className="notif__dismiss"
                      aria-label={t('notifications.dismiss')}
                      title={t('notifications.dismiss')}
                      onClick={() => void dismiss(notification.id, !notification.readAt)}
                    >
                      <X className="notif__dismiss-icon" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
