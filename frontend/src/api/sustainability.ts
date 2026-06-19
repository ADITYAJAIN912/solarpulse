/**
 * Sustainability API calls — lifetime CO₂ savings for a single plant.
 */

import apiClient from './client'
import type { SustainabilitySummary } from '@/types'

export async function getPlantSustainability(
  plantId: number,
): Promise<SustainabilitySummary> {
  const { data } = await apiClient.get<SustainabilitySummary>(
    `/plants/${plantId}/sustainability`,
  )
  return data
}
