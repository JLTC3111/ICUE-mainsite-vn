import { useTranslation } from 'react-i18next'
import { getMainSiteBase, mainSiteLink, newsroomLink } from '../lib/siteOrigin'

export function useMainSite() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const base = getMainSiteBase(lang)

  return {
    base,
    hashLink: (page) => mainSiteLink(page, lang),
    newsroomHref: newsroomLink(lang),
  }
}
