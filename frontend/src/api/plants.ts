/**
 * Plant API calls — list and fetch individual plants.
 *
 * All endpoints require a valid JWT; the shared apiClient attaches it
 * automatically via the request interceptor.
 */

import apiClient from './client'
import type { Plant } from '@/types'

export interface PlantCreatePayload {
  name: string
  location: string
  latitude: number
  longitude: number
  capacity_mw: number
}

export async function getPlants(): Promise<Plant[]> {
  const { data } = await apiClient.get<Plant[]>('/plants')
  return data
}

export async function getPlant(plantId: number): Promise<Plant> {
  const { data } = await apiClient.get<Plant>(`/plants/${plantId}`)
  return data
}

export async function createPlant(payload: PlantCreatePayload): Promise<Plant> {
  const { data } = await apiClient.post<Plant>('/plants', payload)
  return data
}
