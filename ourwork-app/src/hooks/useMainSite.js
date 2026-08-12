import { useTranslation } from 'react-i18next'
import { withLocale } from '@icue/site-routes/mainSitePaths.js'
import { getMainSiteBase, mainSiteLink, newsroomLink, viOnlyLink } from '../lib/siteOrigin'

export function useMainSite() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const base = withLocale(getMainSiteBase(lang), lang)

  return {
    base,
    hashLink: (page) => mainSiteLink(page, lang),
    peopleLink: (path) => viOnlyLink(`people/${path}`, lang),
    structureLink: () => viOnlyLink('structure/', lang),
    newsroomHref: newsroomLink(lang),
  }
}
