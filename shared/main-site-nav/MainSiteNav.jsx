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
  PEOPLE_SUBMENU,
  STANDALONE_DRAWER_LINKS,
} from './buildDrawerNav';
import {
  localizeNavLinks,
  localizePeopleSubmenu,
  resolveNavLabels,
} from './navContent';
import {
  MAIN_SITE_PAGE_PATHS,
  mainSiteOriginForLocale,
  resolveMainSiteLink,
  withLocale,
} from '../site-routes/mainSitePaths.js';
import MainSiteHeader from './MainSiteHeader';
import './MainSiteNav.css';

const DOCK_EXPAND_SCROLL_THRESHOLD = 48;
const DESKTOP_DOCK_MQ = '(min-width: 1025px)';

function isDesktopDockViewport() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_DOCK_MQ).matches;
}

function shouldExpandDock(scrollY = 0) {
  return isDesktopDockViewport() && scrollY <= DOCK_EXPAND_SCROLL_THRESHOLD;
}

function localeHrefForNavLink(link, locale) {
  if (typeof window === 'undefined' || !locale || !MAIN_SITE_PAGE_PATHS[link.page]) {
    return withLocale(link.href, locale);
  }

  const host = window.location.hostname.toLowerCase();
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return withLocale(link.href, locale);
  }

  const target = resolveMainSiteLink(
    link.page,
    locale,
    mainSiteOriginForLocale(locale),
  );

  // Keep same-origin destinations relative so Home's React Router can handle
  // its own pages without a document reload; cross-origin links stay absolute.
  if (target.startsWith('http')) {
    const url = new URL(target);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  }

  return target;
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
    // No page needs the dark nav any more: community-activities was the only
    // one, and it sits on the same light ground as the other apps now.
    darkNav: false,
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
  LanguageControl,
  locale,
  /* Chrome copy. Left undefined the nav speaks Vietnamese, which is what every
     page on icue.vn that has not been localized still wants. An app with UI
     languages of its own passes its current translation here — see
     navContent.js for the shape. */
  labels: labelOverrides,
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
  /* The About page owns one slot in the chrome, and which switch goes in it
     depends on which page is mounted: the converted page publishes a theme
     manager and wants a light/dark toggle, the legacy page publishes a video
     manager and wants the camera. 'video' is the safe default — it is what
     every build of this nav did before the theme switch existed. */
  const [aboutUsControl, setAboutUsControl] = useState('video');
  const [aboutUsThemeDark, setAboutUsThemeDark] = useState(false);
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
    const manager = window.AboutUsBackgroundVideoManager;
    if (manager?.setEnabled) {
      manager.setEnabled(enabled);
      return;
    }

    // The legacy page manager is initialized asynchronously. Preserve the
    // first click so its initialisation can apply the user's intent.
    try {
      localStorage.setItem('aboutUs_bg_video_enabled', enabled ? '1' : '0');
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
    setAboutUsVideoEnabled(!!enabled);
  }, []);

  const syncAboutUsVideoToggleState = useCallback(() => {
    const manager = window.AboutUsBackgroundVideoManager;
    if (!manager) {
      try {
        const raw = localStorage.getItem('aboutUs_bg_video_enabled');
        setAboutUsVideoEnabled(raw === null ? true : raw === '1' || raw === 'true' || raw === 'on');
      } catch {
        setAboutUsVideoEnabled(true);
      }
      return;
    }
    setAboutUsVideoEnabled(!!manager.isEnabled?.());
    setAboutUsVideoToggleDisabled(!manager.canToggleVideos?.());
  }, []);

  const handleAboutUsThemeToggle = useCallback((dark) => {
    window.AboutUsThemeManager?.setDark?.(dark);
  }, []);

  const syncAboutUsThemeState = useCallback(() => {
    const manager = window.AboutUsThemeManager;
    setAboutUsControl(manager ? 'theme' : 'video');
    if (manager) setAboutUsThemeDark(!!manager.isDark?.());
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

  const labels = useMemo(() => resolveNavLabels(labelOverrides), [labelOverrides]);

  const sourceLinks = drawerLinks ?? (isStandalone ? STANDALONE_DRAWER_LINKS : DRAWER_LINKS);
  const drawerLinkConfig = useMemo(
    () => localizeNavLinks(
      sourceLinks.map((link) => ({
        ...link,
        href: localeHrefForNavLink(link, locale),
      })),
      labels,
    ),
    [labels, locale, sourceLinks],
  );
  const peopleSubmenu = useMemo(
    () => {
      const localized = localizePeopleSubmenu(PEOPLE_SUBMENU, labels);
      return {
        ...localized,
        items: localized.items.map((item) => ({
          ...item,
          href: withLocale(item.href, locale),
        })),
      };
    },
    [labels, locale],
  );
  // The pill's tablet overflow is usually the People pair, which the caller
  // reads off the untranslated export — re-label it here too.
  const localizedOverflowItems = useMemo(
    () => localizeNavLinks(
      pillOverflowItems.map((item) => ({
        ...item,
        href: withLocale(item.href, locale),
      })),
      labels,
    ),
    [labels, locale, pillOverflowItems],
  );
  const localizedHomeHref = withLocale(homeHref, locale);
  const localizedContactHref = withLocale(contactHref, locale);

  const { navLinks, people } = useMemo(
    () => buildMainSiteDrawerNav({
      activePage,
      onClose: handleCloseDrawer,
      links: drawerLinkConfig,
      peopleSubmenu,
      peopleOpen,
      onPeopleToggle: () => setPeopleOpen((open) => !open),
    }),
    [activePage, drawerLinkConfig, handleCloseDrawer, peopleOpen, peopleSubmenu],
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
    const onAboutUsVideoManagerReady = () => {
      syncAboutUsVideoToggleState();
      window.AboutUsBackgroundVideoManager?.bindToggleUI?.();
    };
    window.addEventListener('icue:aboutUsVideoEnabled', onAboutUsVideoEnabled);
    window.addEventListener('icue:aboutUsVideoManagerReady', onAboutUsVideoManagerReady);

    return () => {
      window.removeEventListener('icue:aboutUsVideoEnabled', onAboutUsVideoEnabled);
      window.removeEventListener('icue:aboutUsVideoManagerReady', onAboutUsVideoManagerReady);
    };
  }, [showAboutUsVideoToggle, syncAboutUsVideoToggleState]);

  // The theme manager is published by the About page's own effect, which runs
  // after this nav has already mounted — hence the ready event. It fires again
  // on unmount, when the manager is withdrawn, which is what puts the camera
  // back for the legacy About page.
  useEffect(() => {
    if (!showAboutUsVideoToggle) return undefined;

    syncAboutUsThemeState();

    const onAboutUsTheme = () => syncAboutUsThemeState();
    window.addEventListener('icue:aboutUsTheme', onAboutUsTheme);
    window.addEventListener('icue:aboutUsThemeManagerReady', onAboutUsTheme);

    return () => {
      window.removeEventListener('icue:aboutUsTheme', onAboutUsTheme);
      window.removeEventListener('icue:aboutUsThemeManagerReady', onAboutUsTheme);
    };
  }, [showAboutUsVideoToggle, syncAboutUsThemeState]);

  useEffect(() => {
    const ids = [
      'homeVideoToggleContainerDesktop',
      'homeVideoToggleContainerMobile',
      'aboutUsVideoToggleContainerDesktop',
      'aboutUsVideoToggleContainerMobile',
      'aboutUsThemeToggleContainerDesktop',
      'aboutUsThemeToggleContainerMobile',
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
      <nav className={barClass} aria-label={labels.aria.nav}>
        <MainSiteHeader
          drawerOpen={drawerOpen}
          onToggleDrawer={handleToggleDrawer}
          showContactLink={showContactLink}
          showHomeVideoToggle={showHomeVideoToggle}
          showAboutUsVideoToggle={showAboutUsVideoToggle}
          homeHref={localizedHomeHref}
          contactHref={localizedContactHref}
          isStandalone={isStandalone}
          assetPrefix={isStandalone ? '/' : 'public/'}
          homeVideoEnabled={homeVideoEnabled}
          homeVideoToggleDisabled={homeVideoToggleDisabled}
          onHomeVideoToggle={handleHomeVideoToggle}
          aboutUsVideoEnabled={aboutUsVideoEnabled}
          aboutUsVideoToggleDisabled={aboutUsVideoToggleDisabled}
          onAboutUsVideoToggle={handleAboutUsVideoToggle}
          aboutUsControl={aboutUsControl}
          aboutUsThemeDark={aboutUsThemeDark}
          onAboutUsThemeToggle={handleAboutUsThemeToggle}
          menuIconRef={menuIconRef}
          menuToggleRef={menuToggleRef}
          logoLinkRef={logoLinkRef}
          contactLinkRef={contactLinkRef}
          flagLinkRef={flagLinkRef}
          usePillNav={usePillNav}
          activePage={activePage}
          /* The drawer is the full menu; the pill bar is the condensed
             primary nav. An entry marked drawerOnly appears in the former and
             not the latter — community-activities is one, so the pill stays at
             seven items rather than growing an eighth long label. */
          pillItems={drawerLinkConfig.filter((link) => !link.drawerOnly)}
          onNavigate={onNavigate}
          PillHeaderComponent={PillHeaderComponent}
          pillOverflowItems={localizedOverflowItems}
          labels={labels}
          {...(LanguageControl ? { LanguageControl } : {})}
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
        menuLabel={labels.aria.toggleMenu}
        closeLabel={labels.aria.closeMenu}
        navLabel={labels.aria.nav}
        resizeLabel={labels.aria.resizeMenu}
        resizeTitle={labels.aria.resizeMenuTitle}
      />
    </div>
  );
}
