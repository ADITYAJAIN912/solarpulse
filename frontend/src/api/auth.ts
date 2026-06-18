/**
 * Auth API calls — login and registration.
 *
 * Uses the shared apiClient so base URL and headers are consistent.
 * Token storage is handled by the caller (LoginPage) after a successful
 * login; the client interceptor picks it up on subsequent requests.
 */

import apiClient from './client'
import type { TokenResponse } from '@/types'

export interface AuthCredentials {
  email: string
  password: string
}

export async function login(credentials: AuthCredentials): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', credentials)
  return data
}

export async function register(credentials: AuthCredentials): Promise<void> {
  await apiClient.post('/auth/register', credentials)
}
