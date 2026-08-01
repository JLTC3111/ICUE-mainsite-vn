import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_AVATAR } from '../lib/defaults'
import { useMainSite } from '../hooks/useMainSite'
import LanguageSwitcher from './LanguageSwitcher'
import { DrawerMenu } from '@icue/drawer-menu'
import ArticleSearch from './ArticleSearch'
import NotificationBell from './NotificationBell'
import NewsroomThemeToggle from './NewsroomThemeToggle'
import PerformanceModeToggle from './PerformanceModeToggle'
import { isNewsroomReaderRoute } from '../lib/newsroomTheme'
import './Header.css'

function AuthorIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'icue-header__tool-icon',
    'aria-hidden': true,
  }

  if (name === 'articles') {
    return (
      <svg {...common}>
        <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6M9 13h6" />
      </svg>
    )
  }

  if (name === 'editor') {
    return (
      <svg {...common}>
        <path d="M4 20h16" />
        <path d="M7 16V8a2 2 0 0 1 2-2h2" />
        <path d="M14 4h4v4" />
        <path d="m18 4-7 7" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

function AuthorToolsMenu({ onNavigate }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef(null)
  const active = pathname.startsWith('/dashboard') || pathname.startsWith('/assist')

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const go = useCallback(() => {
    setMenuOpen(false)
    onNavigate?.()
  }, [onNavigate])

  return (
    <div className="icue-header__author-tools" ref={rootRef}>
      <div className={`icue-header__author-menu${menuOpen ? ' is-open' : ''}${active ? ' is-active' : ''}`}>
        <button
          type="button"
          className="icue-header__author-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t('nav.authorTools')}
          title={t('nav.authorTools')}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <AuthorIcon name="editor" />
          <span className="icue-header__author-label">{t('nav.assist')}</span>
          <svg className="icue-header__author-chev" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2.5 4.5 6 7.5 9.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {menuOpen && (
          <ul className="icue-header__author-dropdown" role="menu">
            <li role="none">
              <NavLink
                to="/dashboard"
                role="menuitem"
                className="icue-header__author-item"
                onClick={go}
              >
                <AuthorIcon name="articles" />
                <span>{t('nav.dashboard')}</span>
              </NavLink>
            </li>
            <li role="none">
              <NavLink
                to="/assist"
                role="menuitem"
                className="icue-header__author-item"
                onClick={go}
              >
                <AuthorIcon name="editor" />
                <span>{t('nav.assist')}</span>
              </NavLink>
            </li>
          </ul>
        )}
      </div>

      <NavLink to="/write" className="btn btn-accent btn-sm icue-header__write-btn" onClick={onNavigate}>
        {t('nav.write')}
      </NavLink>
    </div>
  )
}

function Header() {
  const { pathname } = useLocation()
  const isReaderRoute = isNewsroomReaderRoute(pathname)
  const isAgentRoute = pathname.startsWith('/assist')
  const showThemeToggle = isReaderRoute || isAgentRoute
  const { t } = useTranslation()
  const { base, archiveLink, hashLink, peopleLink, structureLink } = useMainSite()
  const { isAuthed, profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const handleSearchOpenChange = useCallback((next) => {
    setSearchOpen(next)
    if (next) setOpen(false)
  }, [])
  const handleSignOut = useCallback(async () => {
    await signOut()
    close()
    navigate('/')
  }, [signOut, close, navigate])

  return (
    <header className={`icue-header${searchOpen ? ' is-search-open' : ''}`}>
      <div className="icue-header__inner icue-container">
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
        />
        <ArticleSearch open={searchOpen} onOpenChange={handleSearchOpenChange} />

        <div className="icue-header__brand-box">
          {isReaderRoute && (
            <PerformanceModeToggle className="icue-header__perf-toggle" />
          )}
          <a href={base} className="icue-header__brand" onClick={close} aria-label={`${t('brand')} — icue.vn`}>
            <span className="icue-header__logo">{t('brand')}</span>
            <span className="icue-header__tag">{t('brandBadge')}</span>
          </a>
        </div>

        {isReaderRoute && pathname.startsWith('/article/') && (
          <NewsroomThemeToggle
            showCompactLabel
            className="animated-theme-toggler--header icue-header__theme-toggle icue-header__theme-toggle--article-mobile"
          />
        )}

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
          <div className="icue-header__primary-links" aria-hidden={searchOpen || undefined}>
            <a href={base} className="icue-header__link" onClick={close} tabIndex={searchOpen ? -1 : undefined}>
              {t('nav.mainSite')}
            </a>
            <NavLink to="/" end className="icue-header__link" onClick={close} tabIndex={searchOpen ? -1 : undefined}>
              {t('nav.news')}
            </NavLink>
            <a href={archiveLink()} className="icue-header__link" onClick={close} tabIndex={searchOpen ? -1 : undefined}>
              {t('nav.archive')}
            </a>
          </div>

          {isAuthed && <AuthorToolsMenu key={pathname} onNavigate={close} />}

          <div className="icue-header__right">
            {/* Keyed by account so notification state resets on user switch. */}
            {isAuthed && <NotificationBell key={user?.id} />}
            <LanguageSwitcher />
            {isAuthed ? (
              <button className="icue-header__avatar-btn" onClick={handleSignOut} title={t('nav.logout')}>
                <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="icue-header__avatar" />
                <span className="icue-header__logout-label">{t('nav.logout')}</span>
              </button>
            ) : (
              <Link to="/login" className="btn btn-sm icue-header__login-btn" onClick={close}>
                {t('nav.login')}
              </Link>
            )}
            {showThemeToggle && (
              <NewsroomThemeToggle className="animated-theme-toggler--header icue-header__theme-toggle" />
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
