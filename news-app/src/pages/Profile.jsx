import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../lib/articles'
import './Profile.css'

export default function Profile() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Return to wherever the user came from; fall back to their dashboard.
  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/dashboard')
  }, [navigate])

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [preview, setPreview] = useState(profile?.avatar_url || '')
  const avatarFile = useRef(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const onAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    avatarFile.current = file
    setPreview(URL.createObjectURL(file))
  }, [])

  const save = useCallback(async () => {
    setBusy(true)
    setSaved(false)
    try {
      let url = avatarUrl
      if (avatarFile.current) {
        const res = await uploadAvatar(user.id, avatarFile.current)
        url = res.url
        setAvatarUrl(url)
      }
      await supabase
        .from('profiles')
        .update({ display_name: displayName, full_name: fullName, bio, avatar_url: url })
        .eq('id', user.id)
      await refreshProfile()
      setSaved(true)
      // Brief confirmation, then return to the previous page.
      setTimeout(goBack, 600)
    } finally {
      setBusy(false)
    }
  }, [avatarUrl, displayName, fullName, bio, user, refreshProfile, goBack])

  return (
    <div className="profile icue-container">
      <button type="button" className="btn btn-ghost btn-sm profile__back" onClick={goBack}>
        ← {t('common.back')}
      </button>
      <h1 className="profile__title">{t('profile.avatar')}</h1>

      <div className="profile__avatar-row">
        <div className="profile__avatar">
          {preview ? <img src={preview} alt="" /> : <span>{(displayName || '?').slice(0, 1).toUpperCase()}</span>}
        </div>
        <label className="btn btn-ghost btn-sm">
          {t('profile.changePhoto')}
          <input type="file" accept="image/*" className="visually-hidden" onChange={onAvatarChange} />
        </label>
      </div>

      <div className="profile__fields">
        <label className="field">
          <span>{t('profile.displayName')}</span>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('profile.fullName')}</span>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('profile.bio')}</span>
          <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
        </label>
      </div>

      <div className="profile__foot">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? <span className="spin" /> : t('profile.save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={goBack} disabled={busy}>
          {t('common.cancel')}
        </button>
        {saved && <span className="profile__saved">{t('profile.saved')}</span>}
      </div>
    </div>
  )
}
