import { useEffect, useRef, useState } from 'react';
import { DockIcon } from '@icue/ui/Dock';
import VideoText from '@icue/ui/VideoText';
import LanguageFlagLink from '@icue/main-site-nav/LanguageFlagLink';
import MetallicMenuIcon from '@icue/main-site-nav/MetallicMenuIcon';
import VideoToggle from '@icue/main-site-nav/VideoToggle';
import './PillSiteHeader.css';

// ourWork is a separate app at /our-work — it must be a real navigation, not
// a client-side route inside this SPA.
const INTERNAL_PAGES = new Set(['Home', 'pastProjects', 'aboutUs']);
const TABLET_PRIMARY_PAGES = new Set(['Home', 'ourWork', 'pastProjects', 'News']);
const COMPACT_LABELS = {
  Home: 'Trang Chủ',
  orgStructure: 'Cơ Cấu',
  ourWork: 'Công Việc',
  pastProjects: 'Dự Án',
  News: 'Tin Tức',
  aboutUs: 'Giới Thiệu',
};

function getResponsiveMode() {
  if (window.matchMedia('(max-width: 768px)').matches) return 'mobile';
  if (window.matchMedia('(max-width: 1024px)').matches) return 'tablet';
  return 'desktop';
}

function useResponsiveMode() {
  const [mode, setMode] = useState(getResponsiveMode);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 768px)');
    const tablet = window.matchMedia('(max-width: 1024px)');
    const update = () => setMode(getResponsiveMode());
    mobile.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      mobile.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);

  return mode;
}

function PillLink({ item, active, linkRef, onNavigate }) {
  const className = `pill-site-header__link${active ? ' is-active' : ''}`;
  const label = COMPACT_LABELS[item.page] || item.label;
  const content = (
    <span className="pill-site-header__label-stack">
      <span className="pill-site-header__label">{label}</span>
      <span className="pill-site-header__label pill-site-header__label--hover" aria-hidden="true">
        {label}
      </span>
    </span>
  );
  const commonProps = {
    ref: linkRef,
    className,
    'data-page': item.page,
    'aria-current': active ? 'page' : undefined,
    'aria-label': item.label,
  };

  return (
    <a
      {...commonProps}
      href={item.href}
      onClick={INTERNAL_PAGES.has(item.page) && onNavigate
        ? (event) => {
            event.preventDefault();
            onNavigate(item.href);
          }
        : undefined}
    >
      {content}
    </a>
  );
}

export default function PillSiteHeader({
  activePage,
  items,
  homeHref,
  logoMarkSrc,
  logoVideoSrc,
  drawerOpen,
  onToggleDrawer,
  showHomeVideoToggle,
  showAboutUsVideoToggle,
  homeVideoEnabled,
  homeVideoToggleDisabled,
  onHomeVideoToggle,
  aboutUsVideoEnabled,
  aboutUsVideoToggleDisabled,
  onAboutUsVideoToggle,
  menuIconRef,
  menuToggleRef,
  logoLinkRef,
  contactLinkRef,
  flagLinkRef,
  onNavigate,
  overflowItems = [],
}) {
  const mode = useResponsiveMode();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRootRef = useRef(null);
  const moreButtonRef = useRef(null);
  const isMobile = mode === 'mobile';
  const isTablet = mode === 'tablet';
  const visibleItems = isTablet
    ? items.filter((item) => TABLET_PRIMARY_PAGES.has(item.page))
    : items;
  const tabletOverflowItems = [
    ...items.filter((item) => !TABLET_PRIMARY_PAGES.has(item.page)),
    ...overflowItems,
  ];
  const toggleSuffix = isMobile ? 'Mobile' : 'Desktop';

  useEffect(() => {
    setOverflowOpen(false);
  }, [activePage, mode]);

  useEffect(() => {
    if (!overflowOpen) return undefined;

    const closeFromOutside = (event) => {
      if (!overflowRootRef.current?.contains(event.target)) {
        setOverflowOpen(false);
      }
    };
    const closeFromEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOverflowOpen(false);
      moreButtonRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromEscape);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromEscape);
    };
  }, [overflowOpen]);

  const handleOverflowLink = (event, item) => {
    setOverflowOpen(false);
    if (INTERNAL_PAGES.has(item.page) && onNavigate) {
      event.preventDefault();
      onNavigate(item.href);
    }
  };

  return (
    <div className={`pill-site-header pill-site-header--${mode}`}>
      <a
        ref={logoLinkRef}
        href={homeHref}
        className="pill-site-header__logo"
        aria-label="Về trang chủ"
        onClick={onNavigate
          ? (event) => {
              event.preventDefault();
              onNavigate(homeHref);
            }
          : undefined}
      >
        <img src={logoMarkSrc} alt="" aria-hidden="true" decoding="async" />
        {isMobile ? (
          <VideoText
            className="pill-site-header__mobile-wordmark"
            src={logoVideoSrc}
            fontSize="72"
            fontWeight="700"
            fontFamily="Poppins, system-ui, sans-serif"
            viewBox="0 0 260 120"
            textAnchor="start"
            textX="6%"
            as="span"
          >
            ICUE
          </VideoText>
        ) : (
          <span className="pill-site-header__brand" aria-hidden="true">ICUE</span>
        )}
      </a>

      {!isMobile && (
        <div className="pill-site-header__nav-wrap" ref={overflowRootRef}>
          <div className="pill-site-header__items">
            <ul className="pill-site-header__list">
            {visibleItems.map((item) => {
              const active = item.page === activePage
                || (item.page === 'News' && activePage === 'newsArchive');
              return (
                <li key={item.page}>
                  <PillLink
                    item={item}
                    active={active}
                    linkRef={item.page === 'aboutUs' ? contactLinkRef : undefined}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
              {isTablet && (
                <li>
                  <button
                    ref={moreButtonRef}
                    type="button"
                    className="pill-site-header__link pill-site-header__more"
                    aria-label="Mở thêm mục điều hướng"
                    aria-expanded={overflowOpen}
                    aria-controls="pillSiteTabletOverflow"
                    onClick={() => setOverflowOpen((open) => !open)}
                  >
                    <span className="pill-site-header__more-label">Thêm</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {isTablet && (
            <div
              id="pillSiteTabletOverflow"
              className={`pill-site-header__overflow${overflowOpen ? ' is-open' : ''}`}
              role="menu"
              aria-label="Thêm mục điều hướng"
              aria-hidden={!overflowOpen}
            >
              {tabletOverflowItems.map((item) => (
                <a
                  key={item.page}
                  href={item.href}
                  role="menuitem"
                  className={`pill-site-header__overflow-link${item.page === activePage ? ' is-active' : ''}`}
                  onClick={(event) => handleOverflowLink(event, item)}
                >
                  {COMPACT_LABELS[item.page] || item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pill-site-header__actions">
        {showHomeVideoToggle && (
          <VideoToggle
            id={`homeVideoToggleContainer${toggleSuffix}`}
            inputId={`homeVideoToggle${toggleSuffix}`}
            variant={isMobile ? 'navbar' : 'nav'}
            label="Bật/tắt video nền"
            showLabel={false}
            visible
            animated
            checked={homeVideoEnabled}
            onCheckedChange={onHomeVideoToggle}
            disabled={homeVideoToggleDisabled}
          />
        )}

        {showAboutUsVideoToggle && (
          <VideoToggle
            id={`aboutUsVideoToggleContainer${toggleSuffix}`}
            inputId={`aboutUsVideoToggle${toggleSuffix}`}
            variant={isMobile ? 'navbar' : 'nav'}
            label="Bật/tắt video nền (Giới thiệu)"
            showLabel={false}
            visible
            animated
            checked={aboutUsVideoEnabled}
            onCheckedChange={onAboutUsVideoToggle}
            disabled={aboutUsVideoToggleDisabled}
          />
        )}

        <div className="pill-site-header__language" ref={flagLinkRef}>
          <LanguageFlagLink />
        </div>

        <DockIcon
          className="pill-site-header__menu-icon"
          size={42}
          magnification={42}
          disableMagnification
        >
          <button
            ref={menuToggleRef}
            type="button"
            className="menu-toggle pill-site-header__menu"
            id="menuToggle"
            aria-label="Mở trình đơn đầy đủ"
            aria-expanded={drawerOpen}
            onClick={(event) => {
              event.stopPropagation();
              onToggleDrawer();
            }}
          >
            <MetallicMenuIcon isOpen={drawerOpen} menuIconRef={menuIconRef} />
          </button>
        </DockIcon>
      </div>
    </div>
  );
}
