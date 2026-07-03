import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ProfilePanel from './ProfilePanel'
import ProfileNav from './ProfileNav'
import { useSwipe } from '../hooks/useSwipe'
import { localizePeople } from '../lib/people'
import './ProfileCarousel.css'

function getStoredIndex(group) {
  try {
    const raw = sessionStorage.getItem(`people-carousel-index-${group}`)
    return raw ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

function storeIndex(group, index) {
  try {
    sessionStorage.setItem(`people-carousel-index-${group}`, String(index))
  } catch {
    // ignore
  }
}

export default function ProfileCarousel({ profiles, group }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const localizedProfiles = useMemo(
    () => localizePeople(profiles, lang),
    [profiles, lang],
  )

  const [currentIndex, setCurrentIndex] = useState(() => {
    const stored = getStoredIndex(group)
    return stored < localizedProfiles.length ? stored : 0
  })
  const [direction, setDirection] = useState('right')

  const goTo = useCallback((index, dir = 'right') => {
    setDirection(dir)
    setCurrentIndex(index)
    storeIndex(group, index)
  }, [group])

  const goPrev = useCallback(() => {
    const next = (currentIndex - 1 + localizedProfiles.length) % localizedProfiles.length
    goTo(next, 'left')
  }, [currentIndex, localizedProfiles.length, goTo])

  const goNext = useCallback(() => {
    const next = (currentIndex + 1) % localizedProfiles.length
    goTo(next, 'right')
  }, [currentIndex, localizedProfiles.length, goTo])

  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  useEffect(() => {
    const preload = (idx) => {
      const person = localizedProfiles[idx]
      if (!person) return
      const img = new Image()
      img.src = person.photo
    }
    preload((currentIndex + 1) % localizedProfiles.length)
    preload((currentIndex - 1 + localizedProfiles.length) % localizedProfiles.length)
  }, [currentIndex, localizedProfiles])

  useEffect(() => {
    if (currentIndex >= localizedProfiles.length) {
      goTo(0)
    }
  }, [currentIndex, localizedProfiles.length, goTo])

  const current = localizedProfiles[currentIndex]

  return (
    <section
      className="profile-carousel"
      aria-roledescription="carousel"
      aria-label={t('carousel.aria')}
      {...swipeHandlers}
    >
      <div className="profile-carousel__stage" aria-live="polite">
        {localizedProfiles.map((person, i) => (
          <ProfilePanel
            key={person.id}
            person={person}
            direction={direction}
            isActive={i === currentIndex}
          />
        ))}
      </div>

      <ProfileNav
        count={localizedProfiles.length}
        currentIndex={currentIndex}
        profiles={localizedProfiles}
        onPrev={goPrev}
        onNext={goNext}
        onSelect={(i) => goTo(i, i > currentIndex ? 'right' : 'left')}
      />

      <p className="visually-hidden">
        {t('carousel.viewing', {
          name: current.name,
          current: currentIndex + 1,
          total: localizedProfiles.length,
        })}
      </p>
    </section>
  )
}
