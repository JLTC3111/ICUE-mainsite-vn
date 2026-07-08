import { useTranslation } from 'react-i18next'
import { getMainSiteBase, mainSiteLink, newsroomLink, peopleSiteLink } from '../lib/siteOrigin'

export function useMainSite() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const siteLang = lang === 'vi' ? 'vi' : 'en'
  const base = getMainSiteBase(siteLang)

  return {
    base,
    hashLink: (page) => mainSiteLink(page, siteLang),
    peopleLink: (path) => peopleSiteLink(path),
    newsroomHref: newsroomLink(siteLang),
  }
}
