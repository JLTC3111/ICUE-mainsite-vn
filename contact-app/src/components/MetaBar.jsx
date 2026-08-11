import { useTranslation } from 'react-i18next'
import { PHONE_DISPLAY, PHONE_TEL } from '../data/contactChannels'
import './MetaBar.css'

/**
 * The standing head: what this line describes, where we are, when we answer,
 * and the number.
 *
 * No page name and no language control — the nav above already marks Contact
 * as the current page, and the flag in it is the language menu.
 */
export default function MetaBar() {
  const { t } = useTranslation()

  return (
    <div className="ct-meta">
      <span>{t('masthead.office')}</span>
      <span>{t('masthead.place')}</span>
      <span>{t('masthead.hours')}</span>
      <a href={`tel:${PHONE_TEL}`} className="ct-meta__phone">
        {PHONE_DISPLAY}
      </a>
    </div>
  )
}
