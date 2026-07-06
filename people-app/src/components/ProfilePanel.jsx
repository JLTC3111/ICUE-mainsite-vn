import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeUnicode } from '@icue/text/normalizeUnicode'
import { useInteractiveBackgroundActive } from '../contexts/InteractiveBackgroundContext'
import BorderGlow from './BorderGlow/BorderGlow'
import './ProfilePanel.css'

const GLOW_COLORS_LIGHT = ['#368adf', '#1db7ff', '#4d5053']
const GLOW_COLORS_DARK = ['#c084fc', '#f472b6', '#38bdf8']

const GLOW_PROPS_LIGHT = {
  colors: GLOW_COLORS_LIGHT,
  glowColor: '210 70 60',
  glowIntensity: 0.85,
  edgeSensitivity: 28,
  coneSpread: 25,
  fillOpacity: 0.3,
}

const GLOW_PROPS_DARK = {
  colors: GLOW_COLORS_DARK,
  glowColor: '40 80 80',
  glowIntensity: 1.0,
  edgeSensitivity: 30,
  coneSpread: 25,
  fillOpacity: 0.5,
}

function cardBackground(interactiveBgActive) {
  return interactiveBgActive ? '#120F17' : 'rgba(255, 255, 255, 0.72)'
}

function ProfilePanel({ person, direction, isActive }) {
  const { t } = useTranslation()
  const interactiveBgActive = useInteractiveBackgroundActive()
  const glowProps = interactiveBgActive ? GLOW_PROPS_DARK : GLOW_PROPS_LIGHT
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
        className="profile-panel__glow profile-panel__glow--content"
        backgroundColor={cardBackground(interactiveBgActive)}
        borderRadius={14}
        glowRadius={28}
        animated={isActive}
        {...glowProps}
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
