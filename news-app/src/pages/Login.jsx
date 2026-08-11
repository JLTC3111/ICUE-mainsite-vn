import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getAuthRedirectUrl, isPasswordRecoveryUrl } from '../lib/authRedirect'
import { authErrorKey, sendPasswordResetEmail } from '../lib/authReset'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import './Login.css'

const MIN_PASSWORD_LEN = 8

export default function Login() {
  const { t } = useTranslation()
  useDocumentTitle(t('login.title'))
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/dashboard'

  const [mode, setMode] = useState(() => (isPasswordRecoveryUrl() ? 'recovery' : 'login'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [message, setMessage] = useState('')

  const close = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }, [navigate])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery')
        setMessage('')
        setStatus('idle')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setStatus('loading')
      setMessage('')
      const { error } = await signIn(email.trim(), password)
      if (error) {
        setStatus('error')
        setMessage(t('login.error'))
        return
      }
      navigate(redirectTo, { replace: true })
    },
    [email, password, signIn, navigate, redirectTo, t],
  )

  const handleReset = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setStatus('error')
      setMessage(t('login.resetNeedEmail'))
      return
    }

    setStatus('loading')
    setMessage('')

    const redirectTo = getAuthRedirectUrl('login')
    let { error } = await sendPasswordResetEmail(trimmed, redirectTo)

    // Fallback when the serverless proxy is not deployed yet.
    if (error && (
      String(error.code || '').startsWith('http_404')
      || String(error.code || '').startsWith('http_502')
      || error.code === 'network_error'
    )) {
      ;({ error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo }))
    }

    if (error) {
      setStatus('error')
      setMessage(t(authErrorKey(error)))
      return
    }

    setStatus('success')
    setMessage(t('login.resetSent'))
  }, [email, t])

  const handleUpdatePassword = useCallback(
    async (e) => {
      e.preventDefault()
      setMessage('')

      if (newPassword.length < MIN_PASSWORD_LEN) {
        setStatus('error')
        setMessage(t('login.resetTooShort'))
        return
      }
      if (newPassword !== confirmPassword) {
        setStatus('error')
        setMessage(t('login.resetMismatch'))
        return
      }

      setStatus('loading')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setStatus('error')
        setMessage(t(authErrorKey(error)))
        return
      }

      setStatus('success')
      setMessage(t('login.resetSuccess'))
      window.history.replaceState({}, '', getAuthRedirectUrl('login'))
      setTimeout(() => navigate(redirectTo, { replace: true }), 1200)
    },
    [newPassword, confirmPassword, navigate, redirectTo, t],
  )

  const isRecovery = mode === 'recovery'

  return (
    <div
      className="login"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="login__bg" aria-hidden />
      <div className="login__lang">
        <LanguageSwitcher />
      </div>

      <div className="login__card">
        <button type="button" className="login__close" onClick={close} aria-label={t('common.close')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="login__brand">
          <span className="login__logo">ICUE</span>
          <span className="login__pill">{t('login.brandPill')}</span>
        </div>
        <h1 className="login__title">{isRecovery ? t('login.resetTitle') : t('login.title')}</h1>
        <p className="login__subtitle">{isRecovery ? t('login.resetSubtitle') : t('login.subtitle')}</p>

        {isRecovery ? (
          <form className="login__form" onSubmit={handleUpdatePassword} noValidate>
            <div className="field">
              <label htmlFor="new-password">{t('login.newPassword')}</label>
              <input
                id="new-password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LEN}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="field">
              <label htmlFor="confirm-password">{t('login.confirmPassword')}</label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LEN}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className={`login__msg ${status === 'error' ? 'is-error' : ''} ${status === 'success' ? 'is-success' : ''}`}>
                {message}
              </p>
            )}

            <button className="btn btn-block login__submit" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <span className="spin" />
                  {t('login.loading')}
                </>
              ) : (
                t('login.resetSubmit')
              )}
            </button>
          </form>
        ) : (
          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">{t('login.email')}</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@icue.vn"
              />
            </div>

            <div className="field">
              <label htmlFor="password">{t('login.password')}</label>
              <div className="login__password">
                <input
                  id="password"
                  className="input login__password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="login__password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {message && (
              <p className={`login__msg ${status === 'error' ? 'is-error' : ''} ${status === 'success' ? 'is-success' : ''}`}>
                {message}
              </p>
            )}

            <button className="btn btn-block login__submit" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <span className="spin" />
                  {t('login.loading')}
                </>
              ) : (
                t('login.submit')
              )}
            </button>

            <button
              type="button"
              className="login__forgot"
              onClick={handleReset}
              disabled={status === 'loading'}
            >
              {t('login.forgot')}
            </button>
          </form>
        )}

        <p className="login__note">{t('login.inviteOnly')}</p>
      </div>
    </div>
  )
}
