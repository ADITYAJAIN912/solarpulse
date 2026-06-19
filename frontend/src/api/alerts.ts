/**
 * Alert API calls — fetch AI-generated diagnostic details for a performance alert.
 *
 * All endpoints require a valid JWT; the shared apiClient attaches it
 * automatically via the request interceptor.
 */

import apiClient from './client'
import type { Alert } from '@/types'

export async function getAlert(alertId: number): Promise<Alert> {
  const { data } = await apiClient.get<Alert>(`/alerts/${alertId}`)
  return data
}
