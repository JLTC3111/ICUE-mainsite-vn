import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from './contexts/ThemeContext'
import PageShell from './components/PageShell'
import OurWorkPage from './routes/OurWorkPage'

function LangSync() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'vi'
  }, [i18n.language, i18n.resolvedLanguage])
  return null
}

function CanonicalPathSync() {
  useEffect(() => {
    const { pathname } = window.location
    if (pathname === '/our-work' || pathname === '/our-work/') return

    // Netlify sends every /our-work/* request to this one-page app. Preserve
    // the old router's wildcard behavior without restoring the router bundle.
    window.history.replaceState(window.history.state, '', '/our-work/')
  }, [])
  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <CanonicalPathSync />
      <LangSync />
      <PageShell>
        <OurWorkPage />
      </PageShell>
    </ThemeProvider>
  )
}
