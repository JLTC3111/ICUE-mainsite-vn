import { memo, useCallback, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_AVATAR } from '../lib/defaults'
import { roomChatCopy } from '../lib/roomChatCopy'
import { useMainSite } from '../hooks/useMainSite'
import useMediaQuery from '../hooks/useMediaQuery'
import LanguageSwitcher from './LanguageSwitcher'
import { AnimatedShinyText } from './magicui/AnimatedShinyText'
import AppSwitcher from '../../../shared/app-switcher/AppSwitcher.jsx'
import { liveChatCopy } from '../../../shared/chatbot/lib/liveChatCopy.js'
import './Header.css'
import './ChatHeader.css'

function HeaderLink({ to, end, href, onClick, children }) {
  const label = <AnimatedShinyText className="icue-header__shiny" shimmerWidth={72} animate={false}>{children}</AnimatedShinyText>
  return href
    ? <a href={href} className="icue-header__link" onClick={onClick}>{label}</a>
    : <NavLink to={to} end={end} className="icue-header__link" onClick={onClick}>{label}</NavLink>
}

/** Header shared by the chatrooms and the customer support-chat portal. */
function ChatHeader({ locale, onSignOut }) {
  const { t } = useTranslation()
  const labels = roomChatCopy(locale)
  const { base, hashLink, peopleLink, structureLink } = useMainSite()
  const { isAuthed, isAdmin, profile, signOut } = useAuth()
  const usesOverflowNav = useMediaQuery('(max-width: 860px)')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open || !usesOverflowNav) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, usesOverflowNav])

  // Signing out keeps the visitor on the current chat page, which shows its own sign-in screen.
  const handleSignOut = useCallback(async () => {
    close()
    await (onSignOut || signOut)()
  }, [onSignOut, signOut, close])

  return (
    <header className="icue-header chat-header">
      <div className="icue-header__inner icue-container">
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
          drawerClassName="nav-drawer--fade-close"
          headerAboveDrawer
        />

        <div className="icue-header__brand-box">
          <a href={base} className="icue-header__brand" onClick={close} aria-label={`${t('brand')} — icue.vn`}>
            <span className="icue-header__logo">{t('brand')}</span>
          </a>
          <NavLink to={`/chatrooms?lang=${locale}`} className="icue-header__tag" onClick={close} aria-label={labels.title}>
            {labels.navBadge}
          </NavLink>
          <AppSwitcher currentApp="website" locale={locale} appearance="light" compact className="icue-header__apps" />
        </div>

        <button
          type="button"
          className={`icue-header__burger ${open ? 'is-open' : ''}`}
          aria-label={open ? t('drawer.close') : t('nav.more')}
          aria-expanded={open}
          aria-controls="chat-header-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <svg className="icue-header__kebab" viewBox="0 0 24 24" aria-hidden="true">
            <g className="icue-header__kebab-dot icue-header__kebab-dot--top"><circle cx="12" cy="5" r="1.85" /></g>
            <g className="icue-header__kebab-dot icue-header__kebab-dot--mid"><circle cx="12" cy="12" r="1.85" /></g>
            <g className="icue-header__kebab-dot icue-header__kebab-dot--bot"><circle cx="12" cy="19" r="1.85" /></g>
          </svg>
        </button>

        <nav
          id="chat-header-menu"
          className={`icue-header__nav ${open ? 'is-open' : ''}`}
          aria-label={labels.title}
          aria-hidden={usesOverflowNav && !open ? true : undefined}
        >
          <div className="icue-header__primary-links chat-header__chats">
            <HeaderLink to={`/chatrooms?lang=${locale}`} onClick={close}>{labels.navRooms}</HeaderLink>
            <HeaderLink to={`/portal?lang=${locale}`} onClick={close}>{labels.supportChats}</HeaderLink>
            {isAdmin && <HeaderLink to={`/support?lang=${locale}`} onClick={close}>{liveChatCopy(locale).inbox}</HeaderLink>}
          </div>
          <div className="icue-header__primary-links">
            <HeaderLink href={base} onClick={close}>{t('nav.mainSite')}</HeaderLink>
            <HeaderLink to="/" end onClick={close}>{t('nav.news')}</HeaderLink>
          </div>

          <div className="icue-header__right">
            <LanguageSwitcher />
            {isAuthed ? (
              <button type="button" className="icue-header__avatar-btn" onClick={handleSignOut} title={t('nav.logout')}>
                <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="icue-header__avatar" />
                <span className="icue-header__logout-label">{t('nav.logout')}</span>
              </button>
            ) : (
              <Link to={`/portal?next=chatrooms&lang=${locale}`} className="btn btn-sm icue-header__login-btn" onClick={close}>
                {t('nav.login')}
              </Link>
            )}
          </div>
        </nav>
      </div>
      {usesOverflowNav && (
        <button
          type="button"
          className={`icue-header__backdrop${open ? ' is-open' : ''}`}
          aria-label={t('drawer.close')}
          aria-hidden={open ? undefined : true}
          tabIndex={-1}
          onClick={close}
        />
      )}
    </header>
  )
}

export default memo(ChatHeader)
