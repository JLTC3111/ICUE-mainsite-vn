import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { normalizeUiLocale, withLocale } from '../site-routes/mainSitePaths.js'
import Chatbot from './Chatbot.jsx'
import vi from './locales/vi.json'
import en from './locales/en.json'
import de from './locales/de.json'
import fr from './locales/fr.json'
import ko from './locales/ko.json'
import ja from './locales/ja.json'

const copy = { vi, en, de, fr, ko, ja }

/** Mount once beside the host App so route changes never remount the chat. */
export default function SiteChatbot({ i18n }) {
  const subscribe = useCallback(notify => {
    i18n.on('languageChanged', notify)
    return () => i18n.off('languageChanged', notify)
  }, [i18n])
  const snapshot = useCallback(() => normalizeUiLocale(i18n.resolvedLanguage || i18n.language) || 'vi', [i18n])
  const locale = useSyncExternalStore(subscribe, snapshot, snapshot)
  const labels = useMemo(() => ({ ...copy[locale], ...i18n.getResource(locale, 'translation', 'chat') }), [i18n, locale])
  const links = useMemo(() => ({ faqs: withLocale('/faqs', locale), contact: withLocale('/contact', locale) }), [locale])
  return <Chatbot locale={locale} labels={labels} links={links} />
}
