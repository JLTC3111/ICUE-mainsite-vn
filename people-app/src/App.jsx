import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ExpertsPage from './routes/ExpertsPage'
import CoreTeamPage from './routes/CoreTeamPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter basename="/people">
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
