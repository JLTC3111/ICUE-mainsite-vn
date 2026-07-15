import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcherBase from '@icue/i18n/LanguageSwitcher'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage || i18n.language

  return (
    <LanguageSwitcherBase
      languages={SUPPORTED_LANGUAGES}
      value={current}
      onChange={(code) => i18n.changeLanguage(code)}
      ariaLabel={t('language', { defaultValue: 'Select language' })}
      title={t('language', { defaultValue: 'Language' })}
    />
  )
}

export default memo(LanguageSwitcher)
