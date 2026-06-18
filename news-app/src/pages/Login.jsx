import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LanguageSwitcher from '../components/LanguageSwitcher'
import './Login.css'

export default function Login() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/write'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [message, setMessage] = useState('')

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
    if (!email) return
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    setMessage(t('login.resetSent'))
  }, [email, t])

  return (
    <div className="login">
      <div className="login__bg" aria-hidden />
      <div className="login__lang">
        <LanguageSwitcher />
      </div>

      <div className="login__card">
        <div className="login__brand">
          <span className="login__logo">ICUE</span>
          <span className="login__pill">News</span>
        </div>
        <h1 className="login__title">{t('login.title')}</h1>
        <p className="login__subtitle">{t('login.subtitle')}</p>

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
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className={`login__msg ${status === 'error' ? 'is-error' : ''}`}>{message}</p>
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

          <button type="button" className="login__forgot" onClick={handleReset}>
            {t('login.forgot')}
          </button>
        </form>

        <p className="login__note">{t('login.inviteOnly')}</p>
      </div>
    </div>
  )
}
