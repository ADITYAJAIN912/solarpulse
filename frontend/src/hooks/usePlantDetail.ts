import { useCallback, useEffect, useState } from 'react'
import { getPlantPerformance } from '@/api/performance'
import { getPlant } from '@/api/plants'
import { getApiErrorMessage } from '@/lib/errors'
import type { PerformanceSummary, Plant } from '@/types'

export const DEFAULT_PERFORMANCE_DATE = '2026-06-18'

interface UsePlantDetailResult {
  plant: Plant | null
  performance: PerformanceSummary | null
  selectedDate: string
  setSelectedDate: (date: string) => void
  isPlantLoading: boolean
  isPerformanceLoading: boolean
  plantError: string | null
  performanceError: string | null
  retryPlant: () => void
  retryPerformance: () => void
}

export function usePlantDetail(plantId: number | undefined): UsePlantDetailResult {
  const [plant, setPlant] = useState<Plant | null>(null)
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null)
  const [selectedDate, setSelectedDate] = useState(DEFAULT_PERFORMANCE_DATE)
  const [isPlantLoading, setIsPlantLoading] = useState(true)
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(true)
  const [plantError, setPlantError] = useState<string | null>(null)
  const [performanceError, setPerformanceError] = useState<string | null>(null)

  const fetchPlant = useCallback(async () => {
    if (plantId === undefined) return

    setIsPlantLoading(true)
    setPlantError(null)
    try {
      const data = await getPlant(plantId)
      setPlant(data)
    } catch (err) {
      setPlantError(getApiErrorMessage(err, 'Unable to load plant details.'))
      setPlant(null)
    } finally {
      setIsPlantLoading(false)
    }
  }, [plantId])

  const fetchPerformance = useCallback(async () => {
    if (plantId === undefined) return

    setIsPerformanceLoading(true)
    setPerformanceError(null)
    try {
      const data = await getPlantPerformance(plantId, selectedDate)
      setPerformance(data)
    } catch (err) {
      setPerformanceError(
        getApiErrorMessage(err, 'Unable to load performance data for this date.'),
      )
      setPerformance(null)
    } finally {
      setIsPerformanceLoading(false)
    }
  }, [plantId, selectedDate])

  useEffect(() => {
    fetchPlant()
  }, [fetchPlant])

  useEffect(() => {
    if (plantId === undefined || isPlantLoading || plantError) return
    fetchPerformance()
  }, [fetchPerformance, plantId, isPlantLoading, plantError])

  return {
    plant,
    performance,
    selectedDate,
    setSelectedDate,
    isPlantLoading,
    isPerformanceLoading,
    plantError,
    performanceError,
    retryPlant: fetchPlant,
    retryPerformance: fetchPerformance,
  }
}
