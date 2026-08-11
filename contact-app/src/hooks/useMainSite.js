import { useTranslation } from 'react-i18next'
import { getMainSiteBase, mainSiteLink, newsroomLink, viOnlyLink } from '../lib/siteOrigin'

/**
 * The masthead's six destinations resolve against whichever site the reader
 * came from — icue.vn or en.icue.vn — so leaving this page does not silently
 * change language on them.
 */
export function useMainSite() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const siteLang = lang === 'vi' ? 'vi' : 'en'

  return {
    base: getMainSiteBase(siteLang),
    pageLink: (page) => mainSiteLink(page, siteLang),
    structureLink: () => viOnlyLink('structure/'),
    newsroomHref: newsroomLink(siteLang),
  }
}
