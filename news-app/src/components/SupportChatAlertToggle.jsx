import { useTranslation } from 'react-i18next'
import BellToggle from '../../../shared/ui/BellToggle.jsx'
import useSupportAlerts from '../hooks/useSupportAlerts'
import { supportAlertCopy } from '../lib/supportAlertCopy'

export default function SupportChatAlertToggle() {
  const { i18n } = useTranslation()
  const alerts = useSupportAlerts()
  const copy = supportAlertCopy(i18n.resolvedLanguage || i18n.language)
  if (!alerts) return null
  const count = Math.max(alerts.unread, alerts.toasts.reduce((total, toast) => total + toast.count, 0))
  return (
    <div className="support-alerts__toggle">
      <BellToggle
        offLabel={copy.off}
        onLabel={copy.on}
        label={`${copy.title}: ${alerts.enabled ? copy.disable : copy.enable}${count ? ` · ${count} ${copy.unread}` : ''}`}
        color="#f5f5f5"
        background="#27272a"
        onColor="#18181b"
        onBackground="#f5f5f5"
        size="md"
        radius={22}
        ringAmplitude={17}
        ringPasses={5}
        ringDecay={1}
        ringDuration={820}
        ringPivot={16}
        crossfadeMs={200}
        revealBounce={0}
        count={count}
        ringKey={alerts.arrival}
        badge
        badgeColor="#ef4444"
        waves
        clapper={false}
        pressed={alerts.enabled}
        onChange={alerts.setEnabled}
      />
      {alerts.error && <span className="support-alerts__error" role="status">{copy.reconnecting}</span>}
    </div>
  )
}
