import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { SupportAlertsContext } from './SupportAlertsContext'
import { createSupportAlerts } from '../lib/supportAlerts'
import { supportAlertCopy } from '../lib/supportAlertCopy'
import { withLocale } from '../../../shared/site-routes/mainSitePaths.js'
import SwipeToast from '../../../shared/ui/SwipeToast.jsx'
import './SupportAlerts.css'

const rpc = async (args, options) => {
  const { supportChatRpc } = await import('../lib/supportChat')
  return supportChatRpc('alerts', args, options)
}
const storage = name => { try { return window[name] } catch { return undefined } }

function AlertSession({ userId, children }) {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language
  const copy = supportAlertCopy(locale)
  const service = useMemo(() => createSupportAlerts({ userId, rpc,
    preferenceStorage: storage('localStorage'), sessionStorage: storage('sessionStorage'), window, document }), [userId])
  const alerts = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot)
  useEffect(() => {
    if (!userId) return undefined
    service.start()
    return () => service.stop()
  }, [service, userId])
  const value = useMemo(() => ({ ...alerts, setEnabled: service.setEnabled, refresh: service.refresh }), [alerts, service])
  return (
    <SupportAlertsContext.Provider value={value}>
      {children}
      {userId && alerts.enabled && createPortal(
        <div className="support-alerts__toasts" role="region" aria-label={copy.title}>
          {alerts.toasts.map(toast => (
            <SwipeToast
              key={`${toast.id}:${toast.seq}`}
              inline
              open
              duration={0}
              dismissible={false}
              closeButton={false}
              title={`${copy.message} · ${toast.name || copy.guest}${toast.count > 1 ? ` (${toast.count})` : ''}`}
              description={toast.preview}
              icon={<MessageCircle size={18} aria-hidden="true" />}
              actionLabel={copy.open}
              onActivate={() => navigate(withLocale(`/support?conversation=${toast.id}&status=all`, locale))}
              onClose={() => service.dismiss(toast.id, toast.seq)}
              background="#27272a"
              color="#f5f5f5"
              width={356}
              radius={12}
              slideMs={400}
              settleBounce={0.2}
              swipeDistance={40}
              fuse="bottom"
              pauseOnHover
            />
          ))}
        </div>, document.body,
      )}
    </SupportAlertsContext.Provider>
  )
}

export default function SupportAlertsProvider({ children }) {
  const { user, isAdmin } = useAuth()
  const userId = isAdmin ? user?.id : null
  return <AlertSession key={userId || 'anonymous'} userId={userId}>{children}</AlertSession>
}
