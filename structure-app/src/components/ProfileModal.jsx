import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import ProfileCard from './ProfileCard/ProfileCard'

export default function ProfileModal({ profile, onClose }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const open = Boolean(profile)

  useLayoutEffect(() => { onCloseRef.current = onClose }, [onClose])

  useLayoutEffect(() => {
    if (!open) return undefined
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const background = new Map()
    const inertBackground = () => {
      for (const element of document.body.children) {
        if (element === dialog || element.contains(dialog) || background.has(element)) continue
        background.set(element, element.hasAttribute('inert'))
        element.setAttribute('inert', '')
      }
    }
    inertBackground()
    const observer = typeof window.MutationObserver === 'function' ? new window.MutationObserver(inertBackground) : null
    observer?.observe(document.body, { childList: true })

    const focusClose = () => closeRef.current?.focus({ preventScroll: true })
    const containFocus = event => {
      if (!dialog.contains(event.target)) focusClose()
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const controls = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]')]
        .filter(element => element.tabIndex >= 0 && !element.closest('[hidden], [inert]'))
      const first = controls[0]
      const last = controls.at(-1)
      const outside = !dialog.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || outside)) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && (document.activeElement === last || outside)) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('focusin', containFocus, true)
    document.body.style.overflow = 'hidden'
    focusClose()
    return () => {
      observer?.disconnect()
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('focusin', containFocus, true)
      for (const [element, wasInert] of background) {
        if (!wasInert) element.removeAttribute('inert')
      }
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!profile) return null

  const displayName = t(`orgChart.people.${profile.id}.displayName`)
  const title = t(`orgChart.people.${profile.id}.title`)
  const bio = t(`orgChart.people.${profile.id}.bio`)

  return createPortal(
    <div
      ref={dialogRef}
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
          ref={closeRef}
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

        <div
          key={profile.id}
          className="profile-modal-animated"
        >
          <ProfileCard
            className={`profile-card--${profile.id}`}
            avatarUrl={profile.img}
            miniAvatarUrl={profile.img}
            iconUrl={`${import.meta.env.BASE_URL}profile-card/iconpattern.png`}
            name={displayName}
            title={title}
            handle={profile.handle || profile.id}
            status="ICUE"
            contactText={t('modal.close')}
            holo={0.8}
            glare={0.5}
            tiltStrength={12}
            parallax={8}
            radius={16}
            theme="dark"
            intro
            showUserInfo
            enableTilt
            enableMobileTilt={false}
            onContactClick={onClose}
          />

          {bio ? (
            <p key="bio" className="profile-modal-bio">
              {bio}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
