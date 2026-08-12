import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import LanguageSwitcher from './LanguageSwitcher'
import DocumentSearch from './DocumentSearch'
import { LightRays } from './magicui/LightRays'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'

function Header() {
  const { t } = useTranslation()
  const { base, hashLink, peopleLink, structureLink } = useMainSite()
  const [searchOpen, setSearchOpen] = useState(false)

  const handleSearchOpenChange = useCallback((next) => {
    setSearchOpen(next)
  }, [])

  return (
    <header className={`structure-site-header${searchOpen ? ' is-search-open' : ''}`}>
      <LightRays
        className="structure-site-header__rays"
        count={6}
        color="rgba(54, 138, 223, 0.42)"
        blur={28}
        speed={16}
        length="120px"
      />
      <div className="structure-site-header__inner icue-container">
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
          currentPage="org"
        />

        <a href={base} className="structure-site-header__brand" aria-label={t('nav.mainAria')}>
          <span className="structure-site-header__logo">ICUE</span>
          <span className="structure-site-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="structure-site-header__nav" aria-label={t('nav.mainNav')}>
          <DocumentSearch open={searchOpen} onOpenChange={handleSearchOpenChange} />
          <a href={hashLink('Home')} className="structure-site-header__link">
            {t('nav.home')}
          </a>
          <a href={peopleLink('experts')} className="structure-site-header__link">
            {t('nav.people')}
          </a>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
