import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RecoveryNotice } from '../../../shared/resilience/RecoveryBoundary.jsx'

export default function ProtectedRoute({ children }) {
  const { isAuthed, loading, canEdit } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="route-loading"><RecoveryNotice loading compact /></div>
    )
  }
  if (!isAuthed) {
    return <Navigate to="/portal?mode=staff" replace state={{ from: location.pathname }} />
  }
  if (canEdit === false) return <Navigate to="/portal" replace />
  return children
}
