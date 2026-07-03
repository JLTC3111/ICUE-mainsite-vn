import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ExpertsPage from './routes/ExpertsPage'
import CoreTeamPage from './routes/CoreTeamPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function LangSync() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'vi'
  }, [i18n.language, i18n.resolvedLanguage])
  return null
}

export default function App() {
  return (
    <BrowserRouter basename="/people">
      <LangSync />
      <ScrollToTop />
      <Routes>
        <Route path="/experts" element={<ExpertsPage />} />
        <Route path="/core-team" element={<CoreTeamPage />} />
        <Route path="/" element={<Navigate to="/experts" replace />} />
        <Route path="*" element={<Navigate to="/experts" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
