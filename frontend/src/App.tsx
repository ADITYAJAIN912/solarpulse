import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PlantDetailPage from './pages/PlantDetailPage'
import { TOKEN_KEY } from './api/client'

/**
 * AuthExpiredListener sits inside the router so it can redirect on 401.
 * The api/client dispatches 'sp:auth:expired' rather than importing React
 * Router directly, keeping the Axios layer framework-agnostic.
 */
function AuthExpiredListener() {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = () => navigate('/login', { replace: true })
    window.addEventListener('sp:auth:expired', handler)
    return () => window.removeEventListener('sp:auth:expired', handler)
  }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthExpiredListener />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plants/:plantId"
          element={
            <ProtectedRoute>
              <PlantDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Default redirect — send root to dashboard; login page handles unauthed state */}
        <Route path="*" element={<Navigate to={localStorage.getItem(TOKEN_KEY) ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
