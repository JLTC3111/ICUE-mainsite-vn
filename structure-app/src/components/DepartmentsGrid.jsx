import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import MagicBento from './MagicBento/MagicBento'

const CARD_COLORS = [
  '#0b1220',
  '#101a2e',
  '#0d1830',
  '#122038',
  '#0e1b2f',
  '#111f36',
]

export default function DepartmentsGrid({ departments }) {
  const { t } = useTranslation()

  const cards = useMemo(
    () =>
      departments.map((dept, index) => ({
        id: dept.id,
        color: CARD_COLORS[index % CARD_COLORS.length],
        content: (
          <div className="magic-bento-body">
            <div className="magic-bento-body__top">
              <div className="magic-bento-body__icon">{dept.iconNode}</div>
              <span className="magic-bento-card__label">
                {t('departments.title')}
              </span>
            </div>
            <div className="magic-bento-card__content">
              <h3 className="magic-bento-card__title">
                {t(`departments.items.${dept.id}.name`)}
              </h3>
              <p className="magic-bento-card__description">
                {t(`departments.items.${dept.id}.description`)}
              </p>
            </div>
            <div className="magic-bento-body__meta">
              <div>
                <strong>{t('departments.head')}:</strong> {dept.head}
              </div>
              <div>
                <strong>{t('departments.contact')}:</strong>{' '}
                <a href={`mailto:${dept.email}`}>{dept.email}</a>
              </div>
            </div>
          </div>
        ),
      })),
    [departments, t],
  )

  return (
    <MagicBento
      cards={cards}
      className="card-grid--departments"
      textAutoHide={false}
      enableStars
      enableSpotlight
      enableBorderGlow
      enableTilt={false}
      enableMagnetism
      clickEffect
      glowColor="54, 138, 223"
      particleCount={10}
      spotlightRadius={320}
    />
  )
}
