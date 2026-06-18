/**
 * Axios instance for SolarPulse API calls.
 *
 * Two interceptors handle the entire auth lifecycle:
 *
 * Request interceptor
 *   Reads the JWT from localStorage and attaches it as a Bearer token on
 *   every outgoing request.  This means individual API call sites never need
 *   to think about auth headers — the client handles it transparently.
 *
 * Response interceptor
 *   If any request returns 401 Unauthorized, the stored token is cleared.
 *   The full redirect-to-login flow is wired in App.tsx via an event so this
 *   file stays free of React/router dependencies.
 */

import axios from 'axios'

export const TOKEN_KEY = 'sp_token'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ------------------------------------------------------------------
// Request interceptor — attach JWT if present
// ------------------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ------------------------------------------------------------------
// Response interceptor — clear stale token on 401
// ------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      // Dispatch a custom event so App.tsx can redirect without
      // importing React Router here (keeps this file framework-agnostic).
      window.dispatchEvent(new Event('sp:auth:expired'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
