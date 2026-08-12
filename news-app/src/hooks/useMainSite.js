import { useTranslation } from 'react-i18next'
import {
  getMainSiteBase,
  mainSiteLink,
  peopleSiteLink,
  structureSiteLink,
} from '../lib/siteOrigin'
import { withLocale } from '../../../shared/site-routes/mainSitePaths.js'

/** Legacy static news grid, kept on the same localized main-site origin. */
function legacyNewsArchiveLink(uiLang) {
  const base = getMainSiteBase(uiLang)
  return withLocale(`${base}/news-archive`, uiLang)
}

export function useMainSite() {
  const { i18n } = useTranslation()
  const uiLang = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const siteLang = uiLang === 'en' ? 'en' : 'vi'
  const base = withLocale(getMainSiteBase(uiLang), uiLang)

  return {
    base,
    uiLang,
    siteLang,
    hashLink: (page) => mainSiteLink(page, uiLang),
    peopleLink: (path) => peopleSiteLink(path, uiLang),
    structureLink: (path = '') => structureSiteLink(path, uiLang),
    archiveLink: () => legacyNewsArchiveLink(uiLang),
  }
}
