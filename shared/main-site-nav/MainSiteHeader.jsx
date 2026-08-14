import LanguageFlagLink from './LanguageFlagLink';
import VideoToggle from './VideoToggle';
import VideoText from '@icue/ui/VideoText';
import { Dock, DockIcon } from '@icue/ui/Dock';
import MetallicMenuIcon from './MetallicMenuIcon';
import { NAV_LABELS } from './navContent';

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
  usePillNav = false,
  activePage,
  pillItems = [],
  onNavigate,
  PillHeaderComponent,
  pillOverflowItems = [],
  /* Optional replacement for the flag link. Left undefined, each header keeps
     its own default, which is the icue.vn ↔ en.icue.vn switch. */
  LanguageControl = LanguageFlagLink,
  /* Already resolved by MainSiteNav; the default only matters when this header
     is rendered on its own. */
  labels = NAV_LABELS,
}) {
  const logoVideoSrc = `${assetPrefix}bgVideos/video-text-football.mp4`;
  const contactVideoSrc = `${assetPrefix}bgVideos/blueflow.mp4`;
  const logoMarkSrc = `${assetPrefix}logoIcons/original_logo.png`;

  const showActionsGroup = showHomeVideoToggle || showAboutUsVideoToggle || showContactLink;

  if (usePillNav && PillHeaderComponent) {
    const ResponsivePillHeader = PillHeaderComponent;
    return (
      <ResponsivePillHeader
        activePage={activePage}
        items={pillItems}
        homeHref={homeHref}
        logoMarkSrc={logoMarkSrc}
        logoVideoSrc={logoVideoSrc}
        drawerOpen={drawerOpen}
        onToggleDrawer={onToggleDrawer}
        showHomeVideoToggle={showHomeVideoToggle}
        showAboutUsVideoToggle={showAboutUsVideoToggle}
        homeVideoEnabled={homeVideoEnabled}
        homeVideoToggleDisabled={homeVideoToggleDisabled}
        onHomeVideoToggle={onHomeVideoToggle}
        aboutUsVideoEnabled={aboutUsVideoEnabled}
        aboutUsVideoToggleDisabled={aboutUsVideoToggleDisabled}
        onAboutUsVideoToggle={onAboutUsVideoToggle}
        menuIconRef={menuIconRef}
        menuToggleRef={menuToggleRef}
        logoLinkRef={logoLinkRef}
        contactLinkRef={contactLinkRef}
        flagLinkRef={flagLinkRef}
        onNavigate={onNavigate}
        overflowItems={pillOverflowItems}
        LanguageControl={LanguageControl}
        labels={labels}
      />
    );
  }

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
              aria-label={labels.aria.home}
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
            <button
              ref={menuToggleRef}
              type="button"
              className="menu-toggle"
              id="menuToggle"
              aria-label={labels.aria.toggleMenu}
              aria-expanded={drawerOpen}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDrawer();
              }}
            >
              <MetallicMenuIcon isOpen={drawerOpen} menuIconRef={menuIconRef} />
            </button>
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
                      label={labels.aria.homeVideo}
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
                      label={labels.aria.homeVideo}
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
                      label={labels.aria.aboutUsVideo}
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
                      label={labels.aria.aboutUsVideo}
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
                    {labels.contactWordmark}
                  </VideoText>
                </a>
              )}
            </div>
          )}

          <DockIcon className="main-site-nav__dock-icon main-site-nav__dock-icon--flag">
            <div className="language-switcher" ref={flagLinkRef}>
              <LanguageControl />
            </div>
          </DockIcon>
        </div>
      </Dock>
    </div>
  );
}
