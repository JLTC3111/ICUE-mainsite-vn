import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { registerMainSiteNavBridge } from './bridge';
import MainSiteDrawer from './MainSiteDrawer';
import MainSiteHeader from './MainSiteHeader';
import './MainSiteNav.css';

const DARK_NAV_PAGES = ['communityActivities', 'aboutUs'];

function getPageFromHash() {
  const hash = window.location.hash || '#/Home';
  return hash.replace('#/', '') || 'Home';
}

function getPageVisibility(page) {
  return {
    showContactLink: page === 'Home',
    showHomeVideoToggle: page === 'Home',
    showAboutUsVideoToggle: page === 'aboutUs',
    darkNav: DARK_NAV_PAGES.includes(page),
  };
}

export default function MainSiteNav() {
  const initialPage = getPageFromHash();
  const initialVisibility = getPageVisibility(initialPage);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState(initialPage);
  const [darkNav, setDarkNav] = useState(initialVisibility.darkNav);
  const [showContactLink, setShowContactLink] = useState(initialVisibility.showContactLink);
  const [showHomeVideoToggle, setShowHomeVideoToggle] = useState(initialVisibility.showHomeVideoToggle);
  const [showAboutUsVideoToggle, setShowAboutUsVideoToggle] = useState(initialVisibility.showAboutUsVideoToggle);

  const menuIconRef = useRef(null);
  const menuToggleRef = useRef(null);
  const logoLinkRef = useRef(null);
  const contactLinkRef = useRef(null);
  const flagLinkRef = useRef(null);
  const navRootRef = useRef(null);

  const applyPageState = useCallback((page) => {
    const visibility = getPageVisibility(page);
    setActivePage(page);
    setShowContactLink(visibility.showContactLink);
    setShowHomeVideoToggle(visibility.showHomeVideoToggle);
    setShowAboutUsVideoToggle(visibility.showAboutUsVideoToggle);
    setDarkNav(visibility.darkNav);
    window.__mainSiteNavRefreshLanguage?.();
  }, []);

  const playEntranceAnimation = useCallback((isFirstLoad = true) => {
    if (typeof window.gsap === 'undefined') {
      [menuToggleRef, logoLinkRef, flagLinkRef, contactLinkRef].forEach((ref) => {
        if (ref.current) {
          ref.current.classList.remove('pre-hidden');
          ref.current.style.opacity = '';
          ref.current.style.visibility = '';
        }
      });
      return;
    }

    const targets = [
      { el: menuToggleRef.current, delay: 0 },
      { el: logoLinkRef.current, delay: -0.3 },
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
            el.classList.remove('pre-hidden');
            el.style.opacity = '';
            el.style.visibility = '';
          },
        },
        delay
      );
    });

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

  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;

  useEffect(() => {
    const toggle = document.getElementById('menuToggle');
    const icon = document.getElementById('menuIcon');
    if (toggle) toggle.setAttribute('aria-expanded', String(drawerOpen));
    if (icon) icon.classList.toggle('is-open', drawerOpen);
  }, [drawerOpen]);

  useEffect(() => {
    registerMainSiteNavBridge({
      setDrawerOpen,
      getDrawerOpen: () => drawerOpenRef.current,
      setDarkNav,
      setPage: applyPageState,
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
    const onHashChange = () => applyPageState(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyPageState]);

  useEffect(() => {
    const timer = window.setTimeout(() => playEntranceAnimation(true), 50);
    return () => window.clearTimeout(timer);
  }, [playEntranceAnimation]);

  const navClass = ['main-site-nav', darkNav ? 'nav-on-dark' : '']
    .filter(Boolean)
    .join(' ');

  const barClass = ['main-site-nav__bar', 'menu-bar', darkNav ? 'nav-on-dark' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={navClass} ref={navRootRef}>
      <nav className={barClass} aria-label="Site">
        <MainSiteHeader
          drawerOpen={drawerOpen}
          onToggleDrawer={handleToggleDrawer}
          showContactLink={showContactLink}
          showHomeVideoToggle={showHomeVideoToggle}
          showAboutUsVideoToggle={showAboutUsVideoToggle}
          menuIconRef={menuIconRef}
          menuToggleRef={menuToggleRef}
          logoLinkRef={logoLinkRef}
          contactLinkRef={contactLinkRef}
          flagLinkRef={flagLinkRef}
        />
      </nav>

      <MainSiteDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
