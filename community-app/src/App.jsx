import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Page from './routes/Page'

/**
 * One page, one route — no router. `_redirects` sends every
 * /community-activities/* URL to this document.
 */
export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'vi'
  }, [i18n.language, i18n.resolvedLanguage])

  return <Page />
}
