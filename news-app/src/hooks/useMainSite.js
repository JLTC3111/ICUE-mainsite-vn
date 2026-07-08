import { useTranslation } from 'react-i18next'
import { getMainSiteBase, mainSiteLink, peopleSiteLink, structureSiteLink } from '../lib/siteOrigin'

/** Map UI language to the Vietnamese or English main-site origin. */
function siteLangFromUi(uiLang) {
  return uiLang === 'vi' ? 'vi' : 'en'
}

export function useMainSite() {
  const { i18n } = useTranslation()
  const uiLang = i18n.resolvedLanguage || i18n.language
  const siteLang = siteLangFromUi(uiLang)
  const base = getMainSiteBase(siteLang)

  return {
    base,
    siteLang,
    hashLink: (page) => mainSiteLink(page, siteLang),
    peopleLink: (path) => peopleSiteLink(path),
    structureLink: (path = '') => structureSiteLink(path),
    archiveLink: () => `${base}/#/News`,
  }
}
