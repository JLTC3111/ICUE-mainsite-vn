import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/our-work">
        <LangSync />
        <Routes>
          <Route
            path="/"
            element={
              <PageShell>
                <OurWorkPage />
              </PageShell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
