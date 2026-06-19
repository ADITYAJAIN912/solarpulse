import { useNavigate, useParams } from 'react-router-dom'
import PerformanceDateSelector from '@/components/plant-detail/PerformanceDateSelector'
import PlantDetailBackNav from '@/components/plant-detail/PlantDetailBackNav'
import PlantDetailErrorCard from '@/components/plant-detail/PlantDetailErrorCard'
import PlantDetailHeader from '@/components/plant-detail/PlantDetailHeader'
import AIInsightCard from '@/components/plant-detail/AIInsightCard'
import PerformanceChart from '@/components/plant-detail/PerformanceChart'
import PerformanceSummaryRow from '@/components/plant-detail/PerformanceSummaryRow'
import {
  PerformanceDateSelectorSkeleton,
  PerformanceSummarySkeleton,
  PlantDetailPageSkeleton,
} from '@/components/plant-detail/PlantDetailSkeleton'
import { usePlantDetail } from '@/hooks/usePlantDetail'

function parsePlantId(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) ? id : undefined
}

export default function PlantDetailPage() {
  const navigate = useNavigate()
  const { plantId: plantIdParam } = useParams<{ plantId: string }>()
  const plantId = parsePlantId(plantIdParam)

  const {
    plant,
    performance,
    selectedDate,
    setSelectedDate,
    isPlantLoading,
    isPerformanceLoading,
    plantError,
    performanceError,
    retryPlant,
    retryPerformance,
  } = usePlantDetail(plantId)

  if (plantId === undefined) {
    return (
      <div className="min-h-screen bg-bg-base">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <PlantDetailBackNav onBack={() => navigate('/dashboard')} />
          <PlantDetailErrorCard message="Invalid plant ID." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PlantDetailBackNav onBack={() => navigate('/dashboard')} />

        {isPlantLoading && <PlantDetailPageSkeleton />}

        {!isPlantLoading && plantError && (
          <PlantDetailErrorCard message={plantError} onRetry={retryPlant} />
        )}

        {!isPlantLoading && !plantError && plant && (
          <>
            <PlantDetailHeader plant={plant} />

            <PerformanceDateSelector
              value={selectedDate}
              onChange={setSelectedDate}
              disabled={isPerformanceLoading}
            />

            {isPerformanceLoading && <PerformanceSummarySkeleton />}

            {!isPerformanceLoading && performanceError && (
              <PlantDetailErrorCard
                message={performanceError}
                onRetry={retryPerformance}
              />
            )}

            {!isPerformanceLoading && !performanceError && performance && (
              <PerformanceSummaryRow performance={performance} />
            )}

            {!performanceError && (
              <PerformanceChart
                className="mt-10"
                hourlyReadings={performance?.hourly_readings ?? []}
                date={performance?.date ?? selectedDate}
                isLoading={isPerformanceLoading}
              />
            )}

            <AIInsightCard
              className="mt-10"
              alertId={performance?.alert_id ?? null}
            />
          </>
        )}
      </div>
    </div>
  )
}
