import { useState, useEffect, useCallback } from 'react'
import ProfilePanel from './ProfilePanel'
import ProfileNav from './ProfileNav'
import { useSwipe } from '../hooks/useSwipe'
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
  const [currentIndex, setCurrentIndex] = useState(() => {
    const stored = getStoredIndex(group)
    return stored < profiles.length ? stored : 0
  })
  const [direction, setDirection] = useState('right')

  const goTo = useCallback((index, dir = 'right') => {
    setDirection(dir)
    setCurrentIndex(index)
    storeIndex(group, index)
  }, [group])

  const goPrev = useCallback(() => {
    const next = (currentIndex - 1 + profiles.length) % profiles.length
    goTo(next, 'left')
  }, [currentIndex, profiles.length, goTo])

  const goNext = useCallback(() => {
    const next = (currentIndex + 1) % profiles.length
    goTo(next, 'right')
  }, [currentIndex, profiles.length, goTo])

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
      const person = profiles[idx]
      if (!person) return
      const img = new Image()
      img.src = person.photo
    }
    preload((currentIndex + 1) % profiles.length)
    preload((currentIndex - 1 + profiles.length) % profiles.length)
  }, [currentIndex, profiles])

  useEffect(() => {
    if (currentIndex >= profiles.length) {
      goTo(0)
    }
  }, [currentIndex, profiles.length, goTo])

  const current = profiles[currentIndex]

  return (
    <section
      className="profile-carousel"
      aria-roledescription="carousel"
      aria-label="Hồ sơ thành viên"
      {...swipeHandlers}
    >
      <div className="profile-carousel__stage" aria-live="polite">
        {profiles.map((person, i) => (
          <ProfilePanel
            key={person.id}
            person={person}
            direction={direction}
            isActive={i === currentIndex}
          />
        ))}
      </div>

      <ProfileNav
        count={profiles.length}
        currentIndex={currentIndex}
        profiles={profiles}
        onPrev={goPrev}
        onNext={goNext}
        onSelect={(i) => goTo(i, i > currentIndex ? 'right' : 'left')}
      />

      <p className="visually-hidden">
        Đang xem {current.name}, {currentIndex + 1} trên {profiles.length}
      </p>
    </section>
  )
}
