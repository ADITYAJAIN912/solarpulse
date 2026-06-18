/**
 * Performance API calls — daily PR evaluation for a single plant.
 */

import apiClient from './client'
import type { PerformanceSummary } from '@/types'

export async function getPlantPerformance(
  plantId: number,
  date: string,
): Promise<PerformanceSummary> {
  const { data } = await apiClient.get<PerformanceSummary>(
    `/plants/${plantId}/performance`,
    { params: { date } },
  )
  return data
}
