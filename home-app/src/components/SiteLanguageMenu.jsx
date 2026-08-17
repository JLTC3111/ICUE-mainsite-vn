import { useTranslation } from 'react-i18next'
import LanguageFlagMenu from '@icue/i18n/LanguageFlagMenu'
import { buildLanguageSwitchTarget } from '@icue/main-site-nav/languageSwitcher'
import { CROSS_SITE_LANGUAGE, SUPPORTED_LANGUAGES } from '../lib/i18n'
import { servesAllLocales } from '../lib/routes'

/**
 * Replaces the flag link in the injected nav.
 *
 * Five of the six entries change this app's UI language in place. The sixth,
 * English, is the crossing to en.icue.vn the flag has always been — and it
 * lands on the counterpart of the page you were reading, not the homepage.
 *
 * Except on About. That page is served for both hosts from here, and
 * en.icue.vn/about-us is a redirect back to it, so crossing would send the
 * reader out and immediately back to the page they were already on. There
 * English re-renders in place like the other five.
 *
 * Module scope, not inline in App: a component identity that changed each
 * render would remount the whole nav.
 */
export default function SiteLanguageMenu() {
  const { t, i18n } = useTranslation()

  const handleChange = (code) => {
    if (code !== CROSS_SITE_LANGUAGE.code || servesAllLocales()) {
      i18n.changeLanguage(code)
      return
    }

    // `currentSiteLanguage` is explicit because this app now sets <html lang>
    // to whichever UI language is active, which the host sniffing would read
    // as a site identity on localhost.
    const target = buildLanguageSwitchTarget({ currentSiteLanguage: 'vi' })
    try {
      localStorage.setItem('preferredLanguage', target.targetSite.language)
      localStorage.setItem('lastVisitedPage', target.targetPageName)
      // The UI-language key is shared with every ICUE app, en.icue.vn included.
      // Without this a reader who was reading in German and then asked for
      // English would land on the English site still set to German.
      localStorage.setItem('icue_news_lang', CROSS_SITE_LANGUAGE.code)
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
    window.location.assign(target.targetUrl)
  }

  return (
    <LanguageFlagMenu
      languages={SUPPORTED_LANGUAGES}
      value={i18n.resolvedLanguage || i18n.language}
      onChange={handleChange}
      ariaLabel={t('lang.label')}
    />
  )
}
