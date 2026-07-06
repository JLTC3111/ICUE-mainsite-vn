import { useEffect, useState } from 'react';
import { buildLanguageSwitchTarget } from './languageSwitcher';

export default function LanguageFlagLink() {
  const [target, setTarget] = useState(() => buildLanguageSwitchTarget());

  const refresh = () => setTarget(buildLanguageSwitchTarget());

  useEffect(() => {
    const onHashChange = () => refresh();
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  useEffect(() => {
    window.__mainSiteNavRefreshLanguage = refresh;
    return () => {
      delete window.__mainSiteNavRefreshLanguage;
    };
  }, []);

  const handleClick = () => {
    try {
      localStorage.setItem('preferredLanguage', target.targetSite.language);
      localStorage.setItem('lastVisitedPage', target.targetPageName);
    } catch (e) {
      // ignore
    }

    if (
      ['donations', 'gdpr', 'privacy', 'recruitment', 'terms', 'faqs', 'cookies', 'notableAwards', 'communityActivities'].includes(
        target.targetPageName
      )
    ) {
      try {
        sessionStorage.setItem('language_switch_to_static', target.targetPageName);
      } catch (e) {
        // ignore
      }
    }
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
