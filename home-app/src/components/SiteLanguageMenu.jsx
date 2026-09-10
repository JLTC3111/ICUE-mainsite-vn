import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageFlagMenu from '@icue/i18n/LanguageFlagMenu'
import { buildLanguageSwitchTarget } from '@icue/main-site-nav/languageSwitcher'
import { CROSS_SITE_LANGUAGE, SUPPORTED_LANGUAGES } from '../lib/i18n'
import { servesAllLocales } from '../lib/routes'

/**
 * Replaces the flag link in the injected nav.
 *
 * Every language changes in place on a subpage because all subpages are
 * canonical on icue.vn. Home is the sole exception: choosing English there
 * crosses to the dedicated en.icue.vn React home.
 *
 * Module scope, not inline in App: a component identity that changed each
 * render would remount the whole nav.
 */
export default function SiteLanguageMenu() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const handleChange = (code) => {
    if (code !== CROSS_SITE_LANGUAGE.code || servesAllLocales()) {
      i18n.changeLanguage(code)
      const params = new URLSearchParams(location.search)
      params.delete('site')
      if (params.get('from') === 'en-news') params.delete('from')
      if (servesAllLocales() || code !== 'vi') {
        params.set('lang', code)
      } else {
        params.delete('lang')
      }
      const search = params.toString()
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
          hash: location.hash,
        },
        { replace: true },
      )
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
