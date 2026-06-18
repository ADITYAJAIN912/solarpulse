import { Navigate, useLocation } from 'react-router-dom'
import { TOKEN_KEY } from '@/api/client'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Redirects unauthenticated users to /login, preserving the intended
 * destination so we can send them back after a successful sign-in.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const token = localStorage.getItem(TOKEN_KEY)

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
