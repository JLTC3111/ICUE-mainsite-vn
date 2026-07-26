import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import DrawerMenuPanel from '@icue/drawer-menu/DrawerMenuPanel.jsx';
import DrawerMenuToggle from '@icue/drawer-menu/DrawerMenuToggle.jsx';
import { registerMainSiteNavBridge } from './bridge';
import { pageFromPathname } from './languageSwitcher';
import {
  buildMainSiteDrawerNav,
  DRAWER_LINKS,
  STANDALONE_DRAWER_LINKS,
} from './buildDrawerNav';
import MainSiteHeader from './MainSiteHeader';
import './MainSiteNav.css';

const DARK_NAV_PAGES = ['communityActivities'];
const DOCK_EXPAND_SCROLL_THRESHOLD = 48;
const DESKTOP_DOCK_MQ = '(min-width: 1025px)';

function isDesktopDockViewport() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_DOCK_MQ).matches;
}

function shouldExpandDock(scrollY = 0) {
  return isDesktopDockViewport() && scrollY <= DOCK_EXPAND_SCROLL_THRESHOLD;
}

function getPageFromHash() {
  const hash = window.location.hash || '#/Home';
  return hash.replace('#/', '') || 'Home';
}

function getPageVisibility(page) {
  return {
    showContactLink: true,
    showHomeVideoToggle: page === 'Home',
    showAboutUsVideoToggle: page === 'aboutUs',
    darkNav: DARK_NAV_PAGES.includes(page),
  };
}

export default function MainSiteNav({
  variant = 'hash',
  drawerLinks,
  homeHref = 'https://icue.vn',
  contactHref = '#/aboutUs',
  usePillNav = false,
  onNavigate,
  PillHeaderComponent,
  pillOverflowItems = [],
}) {
  const isStandalone = variant === 'standalone';
  const initialPage = isStandalone ? pageFromPathname(window.location.pathname) : getPageFromHash();
  const initialVisibility = getPageVisibility(initialPage);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [activePage, setActivePage] = useState(initialPage);
  const [darkNav, setDarkNav] = useState(initialVisibility.darkNav);
  const [showContactLink, setShowContactLink] = useState(initialVisibility.showContactLink);
  const [showHomeVideoToggle, setShowHomeVideoToggle] = useState(initialVisibility.showHomeVideoToggle);
  const [showAboutUsVideoToggle, setShowAboutUsVideoToggle] = useState(initialVisibility.showAboutUsVideoToggle);
  const [homeVideoEnabled, setHomeVideoEnabled] = useState(true);
  const [homeVideoToggleDisabled, setHomeVideoToggleDisabled] = useState(false);
  const [aboutUsVideoEnabled, setAboutUsVideoEnabled] = useState(true);
  const [aboutUsVideoToggleDisabled, setAboutUsVideoToggleDisabled] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(() => shouldExpandDock());

  const menuIconRef = useRef(null);
  const menuToggleRef = useRef(null);
  const logoLinkRef = useRef(null);
  const contactLinkRef = useRef(null);
  const flagLinkRef = useRef(null);
  const navRootRef = useRef(null);
  const activePageRef = useRef(initialPage);

  const applyPageState = useCallback((page) => {
    if (isStandalone) {
      const resolvedPage = page || pageFromPathname(window.location.pathname) || 'Home';
      const visibility = getPageVisibility(resolvedPage);
      activePageRef.current = resolvedPage;
      setActivePage(resolvedPage);
      setShowContactLink(visibility.showContactLink);
      setShowHomeVideoToggle(visibility.showHomeVideoToggle);
      setShowAboutUsVideoToggle(visibility.showAboutUsVideoToggle);
      setDarkNav(visibility.darkNav);
      window.__mainSiteNavRefreshLanguage?.();
      return;
    }

    const hashPage = getPageFromHash();
    const hasExplicitHash = Boolean(window.location.hash && window.location.hash.startsWith('#/'));
    const resolvedPage = hasExplicitHash ? hashPage : page;
    const visibility = getPageVisibility(resolvedPage);
    activePageRef.current = resolvedPage;
    setActivePage(resolvedPage);
    setShowContactLink(visibility.showContactLink);
    setShowHomeVideoToggle(visibility.showHomeVideoToggle);
    setShowAboutUsVideoToggle(visibility.showAboutUsVideoToggle);
    setDarkNav(visibility.darkNav);
    window.__mainSiteNavRefreshLanguage?.();
  }, [isStandalone]);

  const handleHomeVideoToggle = useCallback((enabled) => {
    if (window.HomeBackgroundVideoManager?.setEnabled) {
      window.HomeBackgroundVideoManager.setEnabled(enabled);
      return;
    }

    try {
      localStorage.setItem('home_bg_video_enabled', enabled ? '1' : '0');
    } catch {
      // ignore
    }

    window.dispatchEvent(
      new CustomEvent('icue:homeVideoEnabled', {
        detail: { enabled: !!enabled },
      }),
    );
  }, []);

  const syncHomeVideoToggleState = useCallback(() => {
    const manager = window.HomeBackgroundVideoManager;
    if (manager?.isEnabled) {
      setHomeVideoEnabled(!!manager.isEnabled());
      setHomeVideoToggleDisabled(!manager.canToggleVideos?.());
      return;
    }

    try {
      const raw = localStorage.getItem('home_bg_video_enabled');
      setHomeVideoEnabled(raw === null ? true : raw === '1' || raw === 'true' || raw === 'on');
    } catch {
      setHomeVideoEnabled(true);
    }
  }, []);

  const handleAboutUsVideoToggle = useCallback((enabled) => {
    window.AboutUsBackgroundVideoManager?.setEnabled?.(enabled);
  }, []);

  const syncAboutUsVideoToggleState = useCallback(() => {
    const manager = window.AboutUsBackgroundVideoManager;
    if (!manager) return;
    setAboutUsVideoEnabled(!!manager.isEnabled?.());
    setAboutUsVideoToggleDisabled(!manager.canToggleVideos?.());
  }, []);

  const playEntranceAnimation = useCallback((isFirstLoad = true) => {
    const reveal = (el) => {
      if (!el) return;
      el.classList.remove('pre-hidden');
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.transform = '';
    };

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobileNav =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1024px)').matches;

    if (typeof window.gsap === 'undefined' || reduceMotion || isMobileNav) {
      [menuToggleRef, logoLinkRef, flagLinkRef, contactLinkRef].forEach((ref) => {
        reveal(ref.current);
        if (ref === logoLinkRef) {
          reveal(ref.current?.querySelector('.logo-mark'));
          reveal(ref.current?.querySelector('.logo-wordmark'));
        }
        if (ref === flagLinkRef) {
          reveal(ref.current?.querySelector('.flag-link'));
        }
      });
      return;
    }

    const targets = [
      { el: menuToggleRef.current, delay: 0 },
      { el: logoLinkRef.current?.querySelector('.logo-mark'), delay: -0.3 },
      { el: logoLinkRef.current?.querySelector('.logo-wordmark'), delay: -0.25 },
      { el: flagLinkRef.current?.querySelector('.flag-link'), delay: -0.3 },
      { el: contactLinkRef.current, delay: -0.3 },
    ].filter((item) => item.el);

    const timeline = window.gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } });

    targets.forEach(({ el, delay }) => {
      if (!el) return;
      el.classList.add('pre-hidden');
      el.style.opacity = '0';
      el.style.visibility = 'hidden';

      timeline.fromTo(
        el,
        isFirstLoad ? { y: -50, opacity: 0 } : { opacity: 0 },
        {
          y: 0,
          opacity: 1,
          onStart: () => {
            reveal(el);
          },
          onComplete: () => {
            reveal(el);
          },
        },
        delay
      );
    });

    // Safety net for flaky mobile WebKit / Chrome iOS animation completion.
    window.setTimeout(() => {
      targets.forEach(({ el }) => reveal(el));
    }, 2500);

    const langIcon = flagLinkRef.current?.querySelector('#langSwitcher');
    if (langIcon) {
      langIcon.addEventListener('mouseenter', () => {
        window.gsap.killTweensOf(langIcon);
        window.gsap.to(langIcon, { scale: 1.25, duration: 0.3, ease: 'power2.out' });
      });
      langIcon.addEventListener('mouseleave', () => {
        window.gsap.to(langIcon, { scale: 1, duration: 0.3, ease: 'power2.inOut' });
      });
    }

    const contact = contactLinkRef.current;
    if (contact) {
      contact.addEventListener('mouseenter', () => {
        window.gsap.killTweensOf(contact);
        window.gsap.to(contact, { scale: 1.1, duration: 0.3, ease: 'power2.out' });
      });
      contact.addEventListener('mouseleave', () => {
        window.gsap.to(contact, { scale: 1, duration: 0.3, ease: 'power2.inOut' });
      });
    }
  }, []);

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen((open) => !open);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const drawerLinkConfig = drawerLinks ?? (isStandalone ? STANDALONE_DRAWER_LINKS : DRAWER_LINKS);

  const { navLinks, people } = useMemo(
    () => buildMainSiteDrawerNav({
      activePage,
      onClose: handleCloseDrawer,
      links: drawerLinkConfig,
      peopleOpen,
      onPeopleToggle: () => setPeopleOpen((open) => !open),
    }),
    [activePage, drawerLinkConfig, handleCloseDrawer, peopleOpen],
  );

  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;

  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', drawerOpen);
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.classList.remove('nav-drawer-open');
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    registerMainSiteNavBridge({
      setDrawerOpen,
      getDrawerOpen: () => drawerOpenRef.current,
      setDarkNav,
      setPage: applyPageState,
      getPage: () => activePageRef.current,
      playEntranceAnimation,
      refreshLanguageSwitcher: () => window.__mainSiteNavRefreshLanguage?.(),
    });
  }, [applyPageState, playEntranceAnimation]);

  useEffect(() => {
    window.toggleDrawerMenu = () => setDrawerOpen((open) => !open);
    window.closeDrawerMenu = () => setDrawerOpen(false);
    window.setNavLinkContrast = (useLightLinks = false) => setDarkNav(!!useLightLinks);

    return () => {
      delete window.toggleDrawerMenu;
      delete window.closeDrawerMenu;
      delete window.setNavLinkContrast;
    };
  }, []);

  useEffect(() => {
    if (isStandalone) return undefined;
    const onHashChange = () => applyPageState(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyPageState, isStandalone]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_DOCK_MQ);

    const syncDockExpansion = () => {
      setDockExpanded(shouldExpandDock(window.scrollY));
    };

    syncDockExpansion();
    window.addEventListener('scroll', syncDockExpansion, { passive: true });
    mq.addEventListener('change', syncDockExpansion);

    return () => {
      window.removeEventListener('scroll', syncDockExpansion);
      mq.removeEventListener('change', syncDockExpansion);
    };
  }, [usePillNav]);

  useEffect(() => {
    const timer = window.setTimeout(() => playEntranceAnimation(true), 50);
    return () => window.clearTimeout(timer);
  }, [playEntranceAnimation]);

  useEffect(() => {
    if (!showHomeVideoToggle) return undefined;

    syncHomeVideoToggleState();
    window.HomeBackgroundVideoManager?.bindToggleUI?.();

    const onHomeVideoEnabled = () => syncHomeVideoToggleState();
    window.addEventListener('icue:homeVideoEnabled', onHomeVideoEnabled);

    return () => {
      window.removeEventListener('icue:homeVideoEnabled', onHomeVideoEnabled);
    };
  }, [showHomeVideoToggle, syncHomeVideoToggleState]);

  useEffect(() => {
    if (!showAboutUsVideoToggle) return undefined;

    syncAboutUsVideoToggleState();
    window.AboutUsBackgroundVideoManager?.bindToggleUI?.();

    const onAboutUsVideoEnabled = () => syncAboutUsVideoToggleState();
    window.addEventListener('icue:aboutUsVideoEnabled', onAboutUsVideoEnabled);

    return () => {
      window.removeEventListener('icue:aboutUsVideoEnabled', onAboutUsVideoEnabled);
    };
  }, [showAboutUsVideoToggle, syncAboutUsVideoToggleState]);

  useEffect(() => {
    const ids = [
      'homeVideoToggleContainerDesktop',
      'homeVideoToggleContainerMobile',
      'aboutUsVideoToggleContainerDesktop',
      'aboutUsVideoToggleContainerMobile',
      'contactLink',
    ];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = false;
      el.style.removeProperty('display');
      el.classList.remove('pre-hidden');
    });
  }, [showContactLink, showHomeVideoToggle, showAboutUsVideoToggle]);

  const navClass = [
    'main-site-nav',
    usePillNav ? 'main-site-nav--pill' : '',
    dockExpanded ? 'main-site-nav--dock-expanded' : 'main-site-nav--dock-contracted',
    darkNav ? 'nav-on-dark' : '',
    drawerOpen ? 'drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const barClass = ['main-site-nav__bar', 'menu-bar', darkNav ? 'nav-on-dark' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={navClass} ref={navRootRef} data-active-page={activePage}>
      <nav className={barClass} aria-label="Site">
        <MainSiteHeader
          drawerOpen={drawerOpen}
          onToggleDrawer={handleToggleDrawer}
          showContactLink={showContactLink}
          showHomeVideoToggle={showHomeVideoToggle}
          showAboutUsVideoToggle={showAboutUsVideoToggle}
          homeHref={homeHref}
          contactHref={contactHref}
          isStandalone={isStandalone}
          assetPrefix={isStandalone ? '/' : 'public/'}
          homeVideoEnabled={homeVideoEnabled}
          homeVideoToggleDisabled={homeVideoToggleDisabled}
          onHomeVideoToggle={handleHomeVideoToggle}
          aboutUsVideoEnabled={aboutUsVideoEnabled}
          aboutUsVideoToggleDisabled={aboutUsVideoToggleDisabled}
          onAboutUsVideoToggle={handleAboutUsVideoToggle}
          menuIconRef={menuIconRef}
          menuToggleRef={menuToggleRef}
          logoLinkRef={logoLinkRef}
          contactLinkRef={contactLinkRef}
          flagLinkRef={flagLinkRef}
          usePillNav={usePillNav}
          activePage={activePage}
          pillItems={drawerLinkConfig}
          onNavigate={onNavigate}
          PillHeaderComponent={PillHeaderComponent}
          pillOverflowItems={pillOverflowItems}
        />
      </nav>

      <DrawerMenuPanel
        links={navLinks}
        people={people}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        showToggle={false}
        showFloatingClose={false}
        portal={false}
        resizable
        drawerId="drawerMenu"
        overlayId="mainSiteDrawerOverlay"
        menuToggleId="menuToggle"
        drawerClassName="main-site-drawer"
        menuLabel="Toggle navigation menu"
        closeLabel="Close navigation menu"
      />
    </div>
  );
}
