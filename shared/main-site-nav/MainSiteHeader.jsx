import LanguageFlagLink from './LanguageFlagLink';
import VideoToggle from './VideoToggle';
import VideoText from '@icue/ui/VideoText';
import MetallicMenuIcon from './MetallicMenuIcon';

const LOGO_VIDEO_SRC = 'public/bgVideos/video-text-football.mp4';
const CONTACT_VIDEO_SRC = 'public/bgVideos/blueflow.mp4';

export default function MainSiteHeader({
  drawerOpen,
  onToggleDrawer,
  showContactLink,
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
}) {
  return (
    <>
      <div className="main-site-nav__left logo-banner">
        <a
          ref={logoLinkRef}
          href="https://icue.vn"
          id="logo-link"
          className="logo-link"
          aria-label="Go to homepage"
        >
          <img
            className="logo-mark"
            src="public/logoIcons/favicon.png"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
          <VideoText
            className="logo-wordmark"
            src={LOGO_VIDEO_SRC}
            fontSize="72"
            fontWeight="700"
            fontFamily="Poppins, system-ui, sans-serif"
            as="span"
          >
            ICUE
          </VideoText>
        </a>

        <VideoToggle
          id="homeVideoToggleContainerMobile"
          inputId="homeVideoToggleMobile"
          variant="navbar"
          label="Bật/tắt video nền"
          showLabel={false}
          visible={showHomeVideoToggle}
          animated
          checked={homeVideoEnabled}
          onCheckedChange={onHomeVideoToggle}
          disabled={homeVideoToggleDisabled}
        />

        <VideoToggle
          id="aboutUsVideoToggleContainerMobile"
          inputId="aboutUsVideoToggleMobile"
          variant="navbar"
          label="Bật/tắt video nền (Giới thiệu)"
          showLabel={false}
          visible={showAboutUsVideoToggle}
          animated
          checked={aboutUsVideoEnabled}
          onCheckedChange={onAboutUsVideoToggle}
          disabled={aboutUsVideoToggleDisabled}
        />
      </div>

      <div className="main-site-nav__center">
        <button
          ref={menuToggleRef}
          type="button"
          className="menu-toggle"
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
      </div>

      <div className="main-site-nav__right">
        {showContactLink && (
          <a
            ref={contactLinkRef}
            href="#/aboutUs"
            data-page="aboutUs"
            className="contact-link"
            id="contactLink"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '#/aboutUs';
              if (typeof window.closeDrawerMenu === 'function') {
                window.closeDrawerMenu();
              }
            }}
          >
            <VideoText
              className="contact-link-wordmark"
              src={CONTACT_VIDEO_SRC}
              fontSize="64"
              fontWeight="700"
              fontFamily="Poppins, system-ui, sans-serif"
              viewBox="0 0 920 120"
              as="span"
            >
              GIỚI THIỆU
            </VideoText>
          </a>
        )}

        <div className="language-switcher" ref={flagLinkRef}>
          <VideoToggle
            id="homeVideoToggleContainerDesktop"
            inputId="homeVideoToggleDesktop"
            variant="nav"
            showLabel={false}
            visible={showHomeVideoToggle}
            animated
            checked={homeVideoEnabled}
            onCheckedChange={onHomeVideoToggle}
            disabled={homeVideoToggleDisabled}
          />

          <VideoToggle
            id="aboutUsVideoToggleContainerDesktop"
            inputId="aboutUsVideoToggleDesktop"
            variant="nav"
            label="Bật/tắt video nền (Giới thiệu)"
            showLabel={false}
            visible={showAboutUsVideoToggle}
            animated
            checked={aboutUsVideoEnabled}
            onCheckedChange={onAboutUsVideoToggle}
            disabled={aboutUsVideoToggleDisabled}
          />

          <LanguageFlagLink />
        </div>
      </div>
    </>
  );
}
