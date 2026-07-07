import LanguageFlagLink from './LanguageFlagLink';
import VideoToggle from './VideoToggle';

export default function MainSiteHeader({
  drawerOpen,
  onToggleDrawer,
  showContactLink,
  showHomeVideoToggle,
  showAboutUsVideoToggle,
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
          aria-label="Go to homepage"
        >
          <img
            className="logo-content"
            src="public/logoIcons/logo.png"
            alt="Company Logo"
          />
        </a>

        <VideoToggle
          id="homeVideoToggleContainerMobile"
          inputId="homeVideoToggleMobile"
          variant="navbar"
          label="Bật/tắt video nền"
          showLabel={false}
          visible={showHomeVideoToggle}
        />

        <VideoToggle
          id="aboutUsVideoToggleContainerMobile"
          inputId="aboutUsVideoToggleMobile"
          variant="navbar"
          label="Bật/tắt video nền (Giới thiệu)"
          showLabel={false}
          visible={showAboutUsVideoToggle}
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
          <svg
            ref={menuIconRef}
            id="menuIcon"
            className={drawerOpen ? 'is-open' : ''}
            viewBox="0 -0.5 25 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect id="top-bar" x="7.834" y="7.75" width="9.333" height="1.5" fill="currentColor" />
            <rect id="middle-bar" x="5.5" y="11.75" width="14" height="1.5" fill="currentColor" />
            <rect id="bottom-bar" x="7.834" y="15.75" width="9.333" height="1.5" fill="currentColor" />
          </svg>
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
            GIỚI THIỆU
          </a>
        )}

        <div className="language-switcher" ref={flagLinkRef}>
          <VideoToggle
            id="homeVideoToggleContainerDesktop"
            inputId="homeVideoToggleDesktop"
            variant="nav"
            showLabel={false}
            visible={showHomeVideoToggle}
          />

          <VideoToggle
            id="aboutUsVideoToggleContainerDesktop"
            inputId="aboutUsVideoToggleDesktop"
            variant="nav"
            label="Bật/tắt video nền (Giới thiệu)"
            showLabel={false}
            visible={showAboutUsVideoToggle}
          />

          <LanguageFlagLink />
        </div>
      </div>
    </>
  );
}
