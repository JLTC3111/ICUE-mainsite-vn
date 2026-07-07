import { useEffect, useState } from 'react';
import { buildLanguageSwitchTarget } from './languageSwitcher';

export default function LanguageFlagLink() {
  const [target, setTarget] = useState(() => buildLanguageSwitchTarget());

  const refresh = () => setTarget(buildLanguageSwitchTarget());

  useEffect(() => {
    const onNavigate = () => refresh();
    window.addEventListener('hashchange', onNavigate);
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('pageshow', onNavigate);
    return () => {
      window.removeEventListener('hashchange', onNavigate);
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('pageshow', onNavigate);
    };
  }, []);

  useEffect(() => {
    window.__mainSiteNavRefreshLanguage = refresh;
    return () => {
      delete window.__mainSiteNavRefreshLanguage;
    };
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    const fresh = buildLanguageSwitchTarget();

    try {
      localStorage.setItem('preferredLanguage', fresh.targetSite.language);
      localStorage.setItem('lastVisitedPage', fresh.targetPageName);
    } catch (err) {
      // ignore
    }

    if (
      ['donations', 'gdpr', 'privacy', 'recruitment', 'terms', 'faqs', 'cookies', 'notableAwards', 'communityActivities'].includes(
        fresh.targetPageName
      )
    ) {
      try {
        sessionStorage.setItem('language_switch_to_static', fresh.targetPageName);
      } catch (err) {
        // ignore
      }
    }

    window.location.assign(fresh.targetUrl);
  };

  return (
    <a
      id="page-switch"
      href={target.targetUrl}
      className="flag-link"
      aria-label={`Switch to ${target.targetSite.language === 'en' ? 'English' : 'Vietnamese'} version`}
      data-current-lang={target.currentSite.language}
      data-target-lang={target.targetSite.language}
      data-target-domain={target.targetSite.domain}
      onClick={handleClick}
    >
      <span
        id="langSwitcher"
        className={`flag-icon ${target.targetSite.flagClass}`}
      />
    </a>
  );
}
