import { RecoveryNotice } from '../../../shared/resilience/RecoveryBoundary.jsx'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../lib/articles'
import { DEFAULT_AVATAR } from '../lib/defaults'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './Profile.css'

export default function Profile() {
  const { t } = useTranslation()
  useDocumentTitle(t('profile.title'))
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
  const [error, setError] = useState(false)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const navigationTimerRef = useRef(null)
  const previewUrlRef = useRef(null)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(navigationTimerRef.current)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])
  useEffect(() => {
    if (dirtyRef.current || savingRef.current || !profile) return
    setDisplayName(profile.display_name || '')
    setFullName(profile.full_name || '')
    setBio(profile.bio || '')
    setAvatarUrl(profile.avatar_url || '')
    setPreview(profile.avatar_url || '')
  }, [profile])

  const onAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    dirtyRef.current = true
    avatarFile.current = file
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = URL.createObjectURL(file)
    setPreview(previewUrlRef.current)
  }, [])

  const save = useCallback(async () => {
    if (savingRef.current) return
    savingRef.current = true
    setError(false)
    setBusy(true)
    setSaved(false)
    try {
      let url = avatarUrl
      if (avatarFile.current) {
        const res = await uploadAvatar(user.id, avatarFile.current)
        url = res.url
        avatarFile.current = null
        if (mountedRef.current) setAvatarUrl(url)
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName, full_name: fullName, bio, avatar_url: url })
        .eq('id', user.id)
        .select('id')
        .single()
      if (updateError) throw updateError
      await refreshProfile()
      if (!mountedRef.current) return
      setSaved(true)
      // Brief confirmation, then return to the previous page.
      navigationTimerRef.current = setTimeout(goBack, 600)
    } catch {
      if (mountedRef.current) setError(true)
    } finally {
      savingRef.current = false
      if (mountedRef.current) setBusy(false)
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
          <img src={preview || DEFAULT_AVATAR} alt="" />
        </div>
        <label className="btn btn-ghost btn-sm">
          {t('profile.changePhoto')}
          <input type="file" disabled={busy} accept="image/*" className="visually-hidden" onChange={onAvatarChange} />
        </label>
      </div>

      <div className="profile__fields">
        <label className="field">
          <span>{t('profile.displayName')}</span>
          <input className="input" value={displayName} disabled={busy} onChange={(e) => { dirtyRef.current = true; setDisplayName(e.target.value) }} />
        </label>
        <label className="field">
          <span>{t('profile.fullName')}</span>
          <input className="input" value={fullName} disabled={busy} onChange={(e) => { dirtyRef.current = true; setFullName(e.target.value) }} />
        </label>
        <label className="field">
          <span>{t('profile.bio')}</span>
          <textarea className="textarea" value={bio} disabled={busy} onChange={(e) => { dirtyRef.current = true; setBio(e.target.value) }} rows={4} />
        </label>
      </div>

      <div className="profile__foot">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? <span className="spin" /> : t('profile.save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={goBack} disabled={busy}>
          {t('common.cancel')}
        </button>
        {error && <RecoveryNotice onRetry={save} />}
        {saved && <span className="profile__saved">{t('profile.saved')}</span>}
      </div>
    </div>
  )
}
