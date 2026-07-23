import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LanguageFlagLink from './LanguageFlagLink';
import VideoToggle from './VideoToggle';
import VideoText from '@icue/ui/VideoText';
import { Dock, DockIcon } from '@icue/ui/Dock';
import MetallicMenuIcon from './MetallicMenuIcon';

/** Matches `.menu-icon-metallic__layer` transform duration in MainSiteNav.css */
const MENU_MORPH_MS = 500;

export default function MainSiteHeader({
  drawerOpen,
  onToggleDrawer,
  showContactLink,
  showHomeVideoToggle,
  showAboutUsVideoToggle,
  homeHref = 'https://icue.vn',
  contactHref = '#/aboutUs',
  isStandalone = false,
  assetPrefix = 'public/',
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
}) {
  const logoVideoSrc = `${assetPrefix}bgVideos/video-text-football.mp4`;
  const contactVideoSrc = `${assetPrefix}bgVideos/blueflow.mp4`;
  const logoMarkSrc = `${assetPrefix}logoIcons/favicon.png`;

  const showActionsGroup = showHomeVideoToggle || showAboutUsVideoToggle || showContactLink;

  const spacerRef = useRef(null);
  const [navRoot, setNavRoot] = useState(null);
  // When false, toggle sits at viewport center (stable). Morph only runs there so
  // drawer/dock reflow cannot remeasure it mid-animation. Snap back to the dock
  // spacer only after the close morph finishes.
  const [docked, setDocked] = useState(true);

  useEffect(() => {
    setNavRoot(document.querySelector('.main-site-nav'));
  }, []);

  useEffect(() => {
    const btn = typeof menuToggleRef === 'object' ? menuToggleRef?.current : null;

    if (drawerOpen) {
      // Hide one frame while jumping dock → center, then morph in place.
      if (btn) btn.style.opacity = '0';
      setDocked(false);
      let innerRaf = 0;
      const outerRaf = window.requestAnimationFrame(() => {
        innerRaf = window.requestAnimationFrame(() => {
          if (btn) btn.style.opacity = '';
        });
      });
      return () => {
        window.cancelAnimationFrame(outerRaf);
        window.cancelAnimationFrame(innerRaf);
        if (btn) btn.style.opacity = '';
      };
    }

    // Close: keep centered through the morph, then snap back to the dock.
    const t = window.setTimeout(() => {
      if (btn) btn.style.opacity = '0';
      setDocked(true);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (btn) btn.style.opacity = '';
        });
      });
    }, MENU_MORPH_MS);
    return () => {
      window.clearTimeout(t);
      if (btn) btn.style.opacity = '';
    };
  }, [drawerOpen, menuToggleRef]);

  // Only remeasure when fully docked (idle). Never during an open/close morph.
  useLayoutEffect(() => {
    const btn = typeof menuToggleRef === 'object' ? menuToggleRef?.current : null;
    const spacer = spacerRef.current;
    if (!btn || !spacer || !navRoot) return undefined;

    if (!docked) {
      btn.style.removeProperty('position');
      btn.style.removeProperty('left');
      btn.style.removeProperty('top');
      btn.style.removeProperty('transform');
      btn.style.removeProperty('width');
      btn.style.removeProperty('height');
      btn.style.removeProperty('z-index');
      btn.style.removeProperty('margin');
      btn.style.removeProperty('transition');
      return undefined;
    }

    const pinToSpacer = () => {
      const rect = spacer.getBoundingClientRect();
      btn.style.transition = 'none';
      btn.style.position = 'fixed';
      btn.style.left = `${rect.left}px`;
      btn.style.top = `${rect.top}px`;
      btn.style.transform = 'none';
      btn.style.width = `${Math.max(rect.width, 42)}px`;
      btn.style.height = `${Math.max(rect.height, 42)}px`;
      btn.style.zIndex = '1221';
      btn.style.margin = '0';
    };

    pinToSpacer();
    window.addEventListener('resize', pinToSpacer);
    window.addEventListener('scroll', pinToSpacer, true);
    return () => {
      window.removeEventListener('resize', pinToSpacer);
      window.removeEventListener('scroll', pinToSpacer, true);
    };
  }, [docked, navRoot, menuToggleRef]);

  const menuToggleButton = (
    <button
      ref={menuToggleRef}
      type="button"
      className={['menu-toggle', docked ? '' : 'menu-toggle--centered'].filter(Boolean).join(' ')}
      id="menuToggle"
      aria-label="Toggle navigation menu"
      aria-expanded={drawerOpen}
      onClick={(e) => {
        e.stopPropagation();
        onToggleDrawer();
      }}
    >
      <MetallicMenuIcon isOpen={drawerOpen} menuIconRef={menuIconRef} />
    </button>
  );

  return (
    <div className="main-site-nav__dock-wrap">
      <Dock className="main-site-nav__dock main-site-nav__dock--unified" iconSize={44} iconMagnification={50}>
        <div className="main-site-nav__dock-zone main-site-nav__dock-zone--leading">
          <div className="main-site-nav__dock-slot main-site-nav__dock-slot--brand">
            <a
              ref={logoLinkRef}
              href={homeHref}
              id="logo-link"
              className="logo-link"
              aria-label="Go to homepage"
            >
              <img
                className="logo-mark"
                src={logoMarkSrc}
                alt=""
                aria-hidden="true"
                decoding="async"
              />
              <VideoText
                className="logo-wordmark"
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
            </a>
          </div>

          <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--menu">
            <span
              ref={spacerRef}
              className="main-site-nav__menu-toggle-spacer"
              aria-hidden="true"
            />
            {navRoot ? createPortal(menuToggleButton, navRoot) : menuToggleButton}
          </DockIcon>
        </div>

        <div className="main-site-nav__dock-zone main-site-nav__dock-zone--trailing">
          {showActionsGroup && (
            <div className="main-site-nav__dock-actions">
              {showHomeVideoToggle && (
                <>
                  <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--video">
                    <VideoToggle
                      id="homeVideoToggleContainerMobile"
                      inputId="homeVideoToggleMobile"
                      variant="navbar"
                      label="Bật/tắt video nền"
                      showLabel={false}
                      visible
                      animated
                      checked={homeVideoEnabled}
                      onCheckedChange={onHomeVideoToggle}
                      disabled={homeVideoToggleDisabled}
                    />
                  </DockIcon>
                  <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--video">
                    <VideoToggle
                      id="homeVideoToggleContainerDesktop"
                      inputId="homeVideoToggleDesktop"
                      variant="nav"
                      showLabel={false}
                      visible
                      animated
                      checked={homeVideoEnabled}
                      onCheckedChange={onHomeVideoToggle}
                      disabled={homeVideoToggleDisabled}
                    />
                  </DockIcon>
                </>
              )}

              {showAboutUsVideoToggle && (
                <>
                  <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--video">
                    <VideoToggle
                      id="aboutUsVideoToggleContainerMobile"
                      inputId="aboutUsVideoToggleMobile"
                      variant="navbar"
                      label="Bật/tắt video nền (Giới thiệu)"
                      showLabel={false}
                      visible
                      animated
                      checked={aboutUsVideoEnabled}
                      onCheckedChange={onAboutUsVideoToggle}
                      disabled={aboutUsVideoToggleDisabled}
                    />
                  </DockIcon>
                  <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--video">
                    <VideoToggle
                      id="aboutUsVideoToggleContainerDesktop"
                      inputId="aboutUsVideoToggleDesktop"
                      variant="nav"
                      label="Bật/tắt video nền (Giới thiệu)"
                      showLabel={false}
                      visible
                      animated
                      checked={aboutUsVideoEnabled}
                      onCheckedChange={onAboutUsVideoToggle}
                      disabled={aboutUsVideoToggleDisabled}
                    />
                  </DockIcon>
                </>
              )}

              {showContactLink && (
                <a
                  ref={contactLinkRef}
                  href={contactHref}
                  data-page="aboutUs"
                  className="contact-link main-site-nav__dock-contact"
                  id="contactLink"
                  onClick={(e) => {
                    if (!isStandalone) {
                      e.preventDefault();
                      window.location.hash = '#/aboutUs';
                    }
                    if (typeof window.closeDrawerMenu === 'function') {
                      window.closeDrawerMenu();
                    }
                  }}
                >
                  <VideoText
                    className="contact-link-wordmark"
                    src={contactVideoSrc}
                    fontSize="64"
                    fontWeight="700"
                    fontFamily="Poppins, system-ui, sans-serif"
                    viewBox="0 0 620 120"
                    textAnchor="start"
                    textX="3%"
                    as="span"
                  >
                    GIỚI THIỆU
                  </VideoText>
                </a>
              )}
            </div>
          )}

          <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--flag">
            <div className="language-switcher" ref={flagLinkRef}>
              <LanguageFlagLink />
            </div>
          </DockIcon>
        </div>
      </Dock>
    </div>
  );
}
