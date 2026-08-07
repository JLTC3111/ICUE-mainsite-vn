import { useTranslation } from 'react-i18next'
import { getMainSiteBase, mainSiteLink, newsroomLink, viOnlyLink } from '../lib/siteOrigin'

export function useMainSite() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const siteLang = lang === 'vi' ? 'vi' : 'en'
  const base = getMainSiteBase(siteLang)

  return {
    base,
    hashLink: (page) => mainSiteLink(page, siteLang),
    peopleLink: (path) => viOnlyLink(`people/${path}`),
    structureLink: () => viOnlyLink('structure/'),
    newsroomHref: newsroomLink(siteLang),
  }
}
