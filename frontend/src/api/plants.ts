/**
 * Plant API calls — list and fetch individual plants.
 *
 * All endpoints require a valid JWT; the shared apiClient attaches it
 * automatically via the request interceptor.
 */

import apiClient from './client'
import type { Plant } from '@/types'

export async function getPlants(): Promise<Plant[]> {
  const { data } = await apiClient.get<Plant[]>('/plants')
  return data
}
