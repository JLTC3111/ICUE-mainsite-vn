import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import './ProfileNav.css'

function ProfileNav({ count, currentIndex, onPrev, onNext, onSelect, profiles }) {
  const { t } = useTranslation()

  return (
    <div className="profile-nav">
      <div className="profile-nav__thumbs" role="tablist" aria-label={t('carousel.selectMember')}>
        {profiles.map((person, i) => (
          <button
            key={person.id}
            type="button"
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={person.name}
            className={`profile-nav__thumb ${i === currentIndex ? 'profile-nav__thumb--active' : ''}`}
            onClick={() => onSelect(i)}
          >
            <img src={person.photo} alt="" draggable={false} />
          </button>
        ))}
      </div>

      <div className="profile-nav__controls">
        <div className="profile-nav__dots" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className={`profile-nav__dot ${i === currentIndex ? 'profile-nav__dot--active' : ''}`}
            />
          ))}
        </div>

        <div className="profile-nav__arrows">
          <button
            type="button"
            className="profile-nav__arrow"
            onClick={onPrev}
            aria-label={t('carousel.prev')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
            </svg>
          </button>
          <button
            type="button"
            className="profile-nav__arrow"
            onClick={onNext}
            aria-label={t('carousel.next')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ProfileNav)
