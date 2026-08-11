import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '../../../shared/site-meta/useDocumentMeta'

/**
 * Newsroom tab title, in the reader's language.
 *
 * `pageTitle` is a page-specific label the caller has already translated (or
 * untranslatable content, e.g. an article headline). The site name suffix and
 * the meta description come from the active locale, so switching language
 * re-titles the tab without a reload.
 *
 * Pass nothing (or a falsy title, e.g. while an article is still loading) to
 * land on the bare localized site name — otherwise the previous route's title
 * lingers.
 */
export function useDocumentTitle(pageTitle, description) {
  const { t } = useTranslation()
  const siteName = t('meta.siteName')

  useDocumentMeta({
    title: pageTitle ? `${pageTitle} · ${siteName}` : siteName,
    description: description || t('meta.description'),
  })
}
