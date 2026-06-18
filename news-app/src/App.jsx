import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Public landing path is eager-friendly but still split; author tools (heavy
// TipTap editor) are lazy so they never load for anonymous readers.
const NewsGrid = lazy(() => import('./pages/NewsGrid'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))
const Login = lazy(() => import('./pages/Login'))
const Upload = lazy(() => import('./pages/Upload'))
const Edit = lazy(() => import('./pages/Edit'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))

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

// On the dedicated login subdomain, send the bare root straight to the form.
function isLoginHost() {
  return typeof window !== 'undefined' && window.location.hostname.startsWith('newslogin')
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route index element={isLoginHost() ? <Navigate to="/login" replace /> : <NewsGrid />} />
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
