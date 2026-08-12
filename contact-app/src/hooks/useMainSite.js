import { useTranslation } from 'react-i18next'
import { withLocale } from '@icue/site-routes/mainSitePaths.js'
import { getMainSiteBase, mainSiteLink, newsroomLink, viOnlyLink } from '../lib/siteOrigin'

/**
 * Every destination carries the active UI locale explicitly. This remains
 * reliable even when a link crosses between icue.vn and en.icue.vn, whose
 * browser-storage scopes are separate.
 */
export function useMainSite() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language

  return {
    base: withLocale(getMainSiteBase(lang), lang),
    pageLink: (page) => mainSiteLink(page, lang),
    structureLink: () => viOnlyLink('structure/', lang),
    newsroomHref: newsroomLink(lang),
  }
}
