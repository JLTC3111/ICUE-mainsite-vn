import { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { lazyRoute } from './lib/lazyRoute'

// Public landing path is eager-friendly but still split; author tools (heavy
// TipTap editor) are lazy so they never load for anonymous readers.
const NewsGrid = lazyRoute('NewsGrid', () => import('./pages/NewsGrid'))
const ArticleDetail = lazyRoute('ArticleDetail', () => import('./pages/ArticleDetail'))
const Login = lazyRoute('Login', () => import('./pages/Login'))
const Upload = lazyRoute('Upload', () => import('./pages/Upload'))
const Edit = lazyRoute('Edit', () => import('./pages/Edit'))
const Dashboard = lazyRoute('Dashboard', () => import('./pages/Dashboard'))
const Profile = lazyRoute('Profile', () => import('./pages/Profile'))

function RouteFallback() {
  return (
    <div className="route-loading">
      <span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} />
    </div>
  )
}

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
    <BrowserRouter basename="/newsroom">
      <LangSync />
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route index element={<NewsGrid />} />
            <Route path="article/:slug" element={<ArticleDetail />} />

            <Route path="write" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="edit/:id" element={<ProtectedRoute><Edit /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
