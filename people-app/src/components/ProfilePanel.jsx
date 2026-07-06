import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeUnicode } from '@icue/text/normalizeUnicode'
import BorderGlow from './BorderGlow/BorderGlow'
import TiltedCard from './TiltedCard/TiltedCard'
import './ProfilePanel.css'

const GLOW_COLORS = ['#368adf', '#1db7ff', '#4d5053']
const GLOW_PROPS = {
  colors: GLOW_COLORS,
  glowColor: '210 70 60',
  glowIntensity: 0.85,
  edgeSensitivity: 28,
  coneSpread: 25,
  fillOpacity: 0.3,
}

const PHOTO_FILL_FRAME_IDS = new Set(['nguyen-quynh-ly', 'tran-quoc-toan', 'do-bao-long'])

function ProfilePanel({ person, direction, isActive }) {
  const { t } = useTranslation()
  const photoFillsFrame = PHOTO_FILL_FRAME_IDS.has(person.id)
  const displayName = normalizeUnicode(
    [person.honorific, person.name].filter(Boolean).join(' '),
  )
  const slideClass = direction === 'left' ? 'profile-panel--from-left' : 'profile-panel--from-right'

  return (
    <article
      className={`profile-panel ${isActive ? 'profile-panel--active' : ''} ${slideClass}`}
      aria-hidden={!isActive}
    >
      <BorderGlow
        className="profile-panel__glow profile-panel__glow--photo"
        backgroundColor="rgba(255, 255, 255, 0.55)"
        borderRadius={24}
        glowRadius={24}
        {...GLOW_PROPS}
      >
        <div className={`profile-panel__photo-wrap${photoFillsFrame ? ' profile-panel__photo-wrap--fill' : ''}`}>
          <TiltedCard
            className={`tilted-card-figure--profile${photoFillsFrame ? ' tilted-card-figure--profile-fill' : ''}`}
            imageSrc={person.photo}
            altText={displayName}
            containerHeight="100%"
            containerWidth="100%"
            imageWidth="100%"
            imageHeight={photoFillsFrame ? '100%' : 'auto'}
            scaleOnHover={1.03}
            rotateAmplitude={10}
            showMobileWarning={false}
            showTooltip={false}
            loading="eager"
            draggable={false}
          />
        </div>
      </BorderGlow>

      <BorderGlow
        className="profile-panel__glow profile-panel__glow--content"
        backgroundColor="rgba(255, 255, 255, 0.72)"
        borderRadius={14}
        glowRadius={28}
        animated={isActive}
        {...GLOW_PROPS}
      >
        <div className="profile-panel__content">
          {person.title && (
            <p className="profile-panel__title">{normalizeUnicode(person.title)}</p>
          )}
          <h2 className="profile-panel__name">{displayName}</h2>
          <p className="profile-panel__bio">{normalizeUnicode(person.bio)}</p>

          {person.highlights?.length > 0 && (
            <ul className="profile-panel__tags" aria-label={t('carousel.highlights')}>
              {person.highlights.map((tag) => (
                <li key={tag} className="profile-panel__tag">{normalizeUnicode(tag)}</li>
              ))}
            </ul>
          )}

          {person.links?.length > 0 && (
            <div className="profile-panel__links">
              {person.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-panel__link"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </BorderGlow>
    </article>
  )
}

export default memo(ProfilePanel)
