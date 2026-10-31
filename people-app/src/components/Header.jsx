import { memo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import LanguageSwitcher from './LanguageSwitcher'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'
import AppSwitcher from '../../../shared/app-switcher/AppSwitcher.jsx'
import RubberSegment, { toggleSegmentLabels } from '../../../shared/ui/RubberSegment.jsx'

function Header({ backgroundEnabled, onBackgroundToggle, showBackgroundToggle, appearance = 'light' }) {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const { base, hashLink, peopleLink, structureLink } = useMainSite()
  const [offLabel, onLabel] = toggleSegmentLabels(i18n.resolvedLanguage || i18n.language)
  const currentPage = pathname.includes('/experts')
    ? 'experts'
    : pathname.includes('/core-team')
      ? 'core-team'
      : undefined

  return (
    <header className="people-header">
      <div className="people-header__inner icue-container">
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
          currentPage={currentPage}
          drawerClassName="nav-drawer--fade-close"
          headerAboveDrawer
        />

        <a href={base} className="people-header__brand" aria-label={t('nav.mainAria')}>
          <span className="people-header__logo">ICUE</span>
          <span className="people-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="people-header__nav" aria-label={t('nav.mainNav')}>
          <AppSwitcher currentApp="website" locale={i18n.resolvedLanguage || i18n.language} appearance={appearance} compact />
          <RubberSegment className="people-header__segments" role="navigation" aria-label={t('nav.mainNav')} size="sm" value={null} equalSlots={false}
            items={[{ value: 'home', label: t('nav.home'), href: hashLink('Home') }, { value: 'org', label: t('nav.org'), href: structureLink() }]} />
          <LanguageSwitcher />
          {showBackgroundToggle && (
            <RubberSegment role="group" aria-label={backgroundEnabled ? t('video.disableAria') : t('video.enableAria')} size="sm" radius={18}
              value={backgroundEnabled ? 'on' : 'off'}
              items={[{ value: 'off', label: offLabel, itemProps: { 'aria-label': t('video.disableAria') } }, { value: 'on', label: onLabel, itemProps: { 'aria-label': t('video.enableAria') } }]}
              onChange={value => { if ((value === 'on') !== backgroundEnabled) onBackgroundToggle?.() }} />
          )}
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
