import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ContactPage from './routes/ContactPage'

/**
 * One page, one route — no router. `_redirects` sends every /contact/* URL to
 * this document, and there is nothing below it to navigate to.
 */
export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'vi'
  }, [i18n.language, i18n.resolvedLanguage])

  return <ContactPage />
}
