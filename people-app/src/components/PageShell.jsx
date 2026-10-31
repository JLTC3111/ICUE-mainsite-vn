import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DeferredContactSidebar from '@icue/contact-sidebar/DeferredContactSidebar'
import { InteractiveBackgroundProvider } from '../contexts/InteractiveBackgroundContext'
import Header from './Header'
import Footer from './Footer'
import InteractiveBackground from './InteractiveBackground/InteractiveBackground'
import ShimmerButton from './ShimmerButton/ShimmerButton'
import './PageShell.css'
import usePageTheme from '../../../shared/ui/usePageTheme.js'
import RubberSegment from '../../../shared/ui/RubberSegment.jsx'

export default function PageShell({
  pageKey,
  children,
  showHrLink = false,
  showBackgroundToggle = false,
  backgroundEnabled = false,
  onBackgroundToggle,
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const profileGroupLinks = [{ value: 'experts', path: '/experts', label: t('tabs.experts') }, { value: 'core', path: '/core-team', label: t('tabs.coreTeam') }]
  const interactiveBgActive = showBackgroundToggle && backgroundEnabled
  const pageTheme = usePageTheme('people', { theme: interactiveBgActive ? 'dark' : 'light' })

  return (
    <InteractiveBackgroundProvider active={interactiveBgActive}>
      <div className={`page-shell${interactiveBgActive ? ' page-shell--interactive-bg' : ''}`}>
        {showBackgroundToggle && (
          <InteractiveBackground enabled={backgroundEnabled} />
        )}

        <Header
          appearance={pageTheme.theme}
          backgroundEnabled={backgroundEnabled}
          onBackgroundToggle={onBackgroundToggle}
          showBackgroundToggle={showBackgroundToggle}
        />

        <main className="page-shell__main icue-container">
          <div className="page-shell__header">
            <div className="icue-segment-scroll" style={{ marginBottom: 24 }}>
              <RubberSegment role="navigation" aria-label={t('tabs.groupAria')} value={pageKey} size="lg" radius={24}
                trackColor="var(--icue-surface)" thumbColor="var(--icue-gradient-accent)" textColor="var(--icue-text-soft)" activeTextColor="#fff"
                items={profileGroupLinks.map(item => ({ value: item.value, label: item.label, href: `${import.meta.env.BASE_URL || '/people/'}${item.path.slice(1)}`,
                  itemProps: { onClick: event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); navigate(item.path) } } } }))} />
            </div>

            <div className="page-shell__intro">
              <div className="page-shell__titles">
                <h1 className="page-shell__title">{t(`${pageKey}.title`)}</h1>
                <p className="page-shell__subtitle">{t(`${pageKey}.subtitle`)}</p>
              </div>
            </div>
          </div>

          {children}

          {showHrLink && (
            <div className="page-shell__footer-actions">
              {interactiveBgActive ? (
                <a
                  className="page-shell__hr-link"
                  href="https://hr.icue.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="page-shell__hr-label shimmer">{t('hrLink')}</span>
                </a>
              ) : (
                <ShimmerButton
                  href="https://hr.icue.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  borderRadius="999px"
                  background="rgba(0, 0, 0, 0.85)"
                >
                  {t('hrLink')}
                </ShimmerButton>
              )}
            </div>
          )}
        </main>

        <div className="page-shell__site-footer">
          <Footer />
        </div>

        <DeferredContactSidebar
          contentKey={pathname}
          locale={lang}
        />
      </div>
    </InteractiveBackgroundProvider>
  )
}
