import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import ProfileCard from './ProfileCard/ProfileCard'
import {
  AnimatedGroup,
  animatedGroupCustomVariants2,
} from './motion-primitives/AnimatedGroup'

export default function ProfileModal({ profile, onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!profile) return undefined
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [profile, onClose])

  if (!profile) return null

  const displayName = t(`orgChart.people.${profile.id}.displayName`)
  const title = t(`orgChart.people.${profile.id}.title`)
  const bio = t(`orgChart.people.${profile.id}.bio`)

  return createPortal(
    <div
      className="profile-modal"
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="profile-modal-content">
        <button
          type="button"
          className="profile-modal-close"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label={t('modal.close')}
        >
          &times;
        </button>

        <AnimatedGroup
          key={profile.id}
          className="profile-modal-animated"
          variants={animatedGroupCustomVariants2}
        >
          <ProfileCard
            className={`profile-card--${profile.id}`}
            avatarUrl={profile.img}
            miniAvatarUrl={profile.img}
            iconUrl={`${import.meta.env.BASE_URL}profile-card/iconpattern.png`}
            grainUrl={`${import.meta.env.BASE_URL}profile-card/noise.png`}
            name={displayName}
            title={title}
            handle={profile.handle || profile.id}
            status="ICUE"
            contactText={t('modal.close')}
            showUserInfo
            enableTilt
            enableMobileTilt={false}
            behindGlowEnabled
            behindGlowColor="rgba(54, 138, 223, 0.55)"
            innerGradient="linear-gradient(145deg, rgba(40,33,168,0.55) 0%, rgba(54,138,223,0.35) 100%)"
            onContactClick={onClose}
            animateEntrance
          />

          {bio ? (
            <p key="bio" className="profile-modal-bio">
              {bio}
            </p>
          ) : null}
        </AnimatedGroup>
      </div>
    </div>,
    document.body,
  )
}
