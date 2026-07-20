import { memo, useState, useCallback } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_AVATAR } from '../lib/defaults'
import { useMainSite } from '../hooks/useMainSite'
import LanguageSwitcher from './LanguageSwitcher'
import { DrawerMenu } from '@icue/drawer-menu'
import ArticleSearch from './ArticleSearch'
import NewsroomThemeToggle from './NewsroomThemeToggle'
import './Header.css'

function Header() {
  const { pathname } = useLocation()
  const isNewsHome = pathname === '/'
  const { t } = useTranslation()
  const { base, archiveLink, hashLink, peopleLink, structureLink } = useMainSite()
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
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
        />
        <ArticleSearch />

        <a href={base} className="icue-header__brand" onClick={close} aria-label={`${t('brand')} — icue.vn`}>
          <span className="icue-header__logo">{t('brand')}</span>
          <span className="icue-header__tag">{t('brandBadge')}</span>
        </a>

        <button
          className={`icue-header__burger ${open ? 'is-open' : ''}`}
          aria-label={t('nav.news')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          )}
        </button>

        <nav className={`icue-header__nav ${open ? 'is-open' : ''}`}>
          {isNewsHome && (
            <NewsroomThemeToggle className="newsroom-theme-toggle--header icue-header__theme-toggle" />
          )}
          <a href={base} className="icue-header__link" onClick={close}>
            {t('nav.mainSite')}
          </a>
          <NavLink to="/" end className="icue-header__link" onClick={close}>
            {t('nav.news')}
          </NavLink>
          <a href={archiveLink()} className="icue-header__link" onClick={close}>
            {t('nav.archive')}
          </a>

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
                <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="icue-header__avatar" />
                <span className="icue-header__logout-label">{t('nav.logout')}</span>
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm" onClick={close}>
                {t('nav.login')}
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
