import { memo, useState, useCallback } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const MAIN_SITE = 'https://icue.vn'

function Header() {
  const { t } = useTranslation()
  const { isAuthed, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const handleSignOut = useCallback(async () => {
    await signOut()
    close()
    navigate('/')
  }, [signOut, close, navigate])

  return (
    <header className="icue-header">
      <div className="icue-header__inner icue-container">
        <Link to="/" className="icue-header__brand" onClick={close} aria-label="ICUE News">
          <span className="icue-header__logo">ICUE</span>
          <span className="icue-header__tag">News</span>
        </Link>

        <button
          className={`icue-header__burger ${open ? 'is-open' : ''}`}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <nav className={`icue-header__nav ${open ? 'is-open' : ''}`}>
          <a href={MAIN_SITE} className="icue-header__link" onClick={close}>
            {t('nav.mainSite')}
          </a>
          <NavLink to="/" end className="icue-header__link" onClick={close}>
            {t('nav.news')}
          </NavLink>

          {isAuthed && (
            <>
              <NavLink to="/dashboard" className="icue-header__link" onClick={close}>
                {t('nav.dashboard')}
              </NavLink>
              <NavLink to="/write" className="btn btn-accent btn-sm" onClick={close}>
                {t('nav.write')}
              </NavLink>
            </>
          )}

          <div className="icue-header__right">
            <LanguageSwitcher />
            {isAuthed ? (
              <button className="icue-header__avatar-btn" onClick={handleSignOut} title={t('nav.logout')}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="icue-header__avatar" />
                ) : (
                  <span className="icue-header__avatar icue-header__avatar--fallback">
                    {(profile?.display_name || profile?.full_name || '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="icue-header__logout-label">{t('nav.logout')}</span>
              </button>
            ) : (
              <a href={loginUrl()} className="btn btn-primary btn-sm" onClick={close}>
                {t('nav.login')}
              </a>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

// Login lives on its own subdomain in production; locally it is the /login route.
function loginUrl() {
  const origin = import.meta.env.VITE_LOGIN_ORIGIN
  if (origin && !location.hostname.includes('localhost')) return origin
  return '/login'
}

export default memo(Header)
