import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

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

  return (
    <div
      className="profile-modal"
      role="dialog"
      aria-modal="true"
      aria-label={profile.displayName}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="profile-modal-content">
        <button
          type="button"
          className="profile-modal-close"
          onClick={onClose}
          aria-label={t('modal.close')}
        >
          &times;
        </button>
        <div className="profile-modal-body">
          <img src={profile.img} alt={profile.displayName} />
          <h2>{profile.displayName}</h2>
          <p className="profile-title">{profile.title}</p>
          <p className="profile-bio">{profile.bio}</p>
        </div>
      </div>
    </div>
  )
}
