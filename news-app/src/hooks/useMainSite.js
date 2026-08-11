import { useTranslation } from 'react-i18next'
import {
  SITES,
  getMainSiteBase,
  mainSiteLink,
  peopleSiteLink,
  structureSiteLink,
} from '../lib/siteOrigin'

/** Map UI language to the Vietnamese or English main-site origin. */
function siteLangFromUi(uiLang) {
  return uiLang === 'vi' ? 'vi' : 'en'
}

/** Legacy static news grid (pre-newsroom archive). EN UI → en.icue.vn. */
function legacyNewsArchiveLink(siteLang) {
  const base = siteLang === 'vi' ? SITES.vi : SITES.en
  return `${base}/news-archive`
}

export function useMainSite() {
  const { i18n } = useTranslation()
  const uiLang = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const siteLang = siteLangFromUi(uiLang)
  const base = getMainSiteBase(siteLang)

  return {
    base,
    uiLang,
    siteLang,
    hashLink: (page) => mainSiteLink(page, siteLang),
    peopleLink: (path) => peopleSiteLink(path),
    structureLink: (path = '') => structureSiteLink(path),
    archiveLink: () => legacyNewsArchiveLink(siteLang),
  }
}
