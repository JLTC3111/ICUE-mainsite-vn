import { useTranslation } from 'react-i18next'
import LanguageFlagMenu from '@icue/i18n/LanguageFlagMenu'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'

/**
 * Replaces the flag in the site nav for this page only.
 *
 * On every other main-site page that flag is a link between icue.vn and
 * en.icue.vn. This app carries all six UI languages itself, so the same disc
 * becomes a menu of them — passed to MainSiteNav as `LanguageControl`, which
 * defaults back to the domain switch everywhere else.
 *
 * Declared at module scope, not inline in the page: a component identity that
 * changed every render would remount the whole nav on every keystroke.
 */
export default function PageLanguageMenu() {
  const { t, i18n } = useTranslation()

  return (
    <LanguageFlagMenu
      languages={SUPPORTED_LANGUAGES}
      value={i18n.resolvedLanguage || i18n.language}
      onChange={(code) => i18n.changeLanguage(code)}
      ariaLabel={t('lang.label')}
    />
  )
}
