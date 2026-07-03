import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeUnicode } from '@icue/text/normalizeUnicode'
import './ProfilePanel.css'

function ProfilePanel({ person, direction, isActive }) {
  const { t } = useTranslation()
  const displayName = normalizeUnicode(
    [person.honorific, person.name].filter(Boolean).join(' '),
  )
  const slideClass = direction === 'left' ? 'profile-panel--from-left' : 'profile-panel--from-right'

  return (
    <article
      className={`profile-panel ${isActive ? 'profile-panel--active' : ''} ${slideClass}`}
      aria-hidden={!isActive}
    >
      <div className="profile-panel__photo-wrap">
        <img
          src={person.photo}
          alt={displayName}
          className="profile-panel__photo"
          loading="eager"
          draggable={false}
        />
      </div>

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
    </article>
  )
}

export default memo(ProfilePanel)
