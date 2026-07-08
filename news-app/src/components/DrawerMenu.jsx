import { memo, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMainSite } from '../hooks/useMainSite'
import './DrawerMenu.css'

const Icon = ({ children }) => (
  <svg
    className="nav-drawer__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    {children}
  </svg>
)

function DrawerMenu() {
  const { t } = useTranslation()
  const { hashLink, peopleLink, structureLink } = useMainSite()
  const [open, setOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    setPeopleOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className={`nav-drawer__toggle ${open ? 'is-open' : ''}`}
        aria-label={t('drawer.menu')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span /><span /><span />
      </button>

      <div
        className={`nav-drawer__overlay ${open ? 'is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside className={`nav-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav className="nav-drawer__links" aria-label="Site">
          <a href={hashLink('Home')} onClick={close}>
            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></Icon>
            {t('drawer.home')}
          </a>

          <a href={structureLink()} onClick={close}>
            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></Icon>
            {t('drawer.org')}
          </a>

          <a href={hashLink('ourWork')} onClick={close}>
            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25v-4.073M20.25 14.15A2.25 2.25 0 0 0 21 12.45V8.7a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 8.7v3.75c0 .729.348 1.377.886 1.788M16.5 6.45V5.25a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 7.5 5.25v1.2m9 0h-9" /></Icon>
            {t('drawer.work')}
          </a>

          <a href={hashLink('pastProjects')} onClick={close}>
            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></Icon>
            {t('drawer.projects')}
          </a>

          <a href={hashLink('News')} onClick={close}>
            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></Icon>
            {t('drawer.newsEvents')}
          </a>

          <a href={hashLink('aboutUs')} onClick={close}>
            <Icon>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </Icon>
            {t('drawer.about')}
          </a>

          <button
            type="button"
            className={`nav-drawer__submenu-toggle ${peopleOpen ? 'is-open' : ''}`}
            aria-expanded={peopleOpen}
            onClick={() => setPeopleOpen((v) => !v)}
          >
            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></Icon>
            <span>{t('drawer.people')}</span>
            <svg className="nav-drawer__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <div className={`nav-drawer__submenu ${peopleOpen ? 'is-open' : ''}`}>
            <a href={peopleLink('experts')} onClick={close}>
              <Icon><path strokeLinecap="round" strokeLinejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" /></Icon>
              {t('drawer.experts')}
            </a>
            <a href={peopleLink('core-team')} onClick={close}>
              <Icon><path strokeLinecap="round" strokeLinejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" /></Icon>
              {t('drawer.coreTeam')}
            </a>
          </div>
        </nav>
      </aside>
    </>
  )
}

export default memo(DrawerMenu)
