import { useTranslation } from 'react-i18next'
import Glyph from './Glyph'
import { BENEFIT_ICONS, BENEFIT_KEYS } from '../data/icons'

export default function BenefitGrid() {
  const { t } = useTranslation()

  return (
    <section className="rc-benefits">
      <div className="rc-container">
        <h2 className="rc-section__title">{t('benefits.title')}</h2>
        <p className="rc-section__subtitle">{t('benefits.subtitle')}</p>

        <ul className="rc-benefits__grid">
          {BENEFIT_KEYS.map((key) => (
            <li className="rc-benefit" key={key}>
              <Glyph markup={BENEFIT_ICONS[key]} className="rc-benefit__icon" />
              <h3 className="rc-benefit__title">{t(`benefits.items.${key}.title`)}</h3>
              <p className="rc-benefit__body">{t(`benefits.items.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
