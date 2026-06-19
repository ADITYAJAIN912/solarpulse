/**
 * PlantDetailPage — production-grade plant analysis view.
 *
 * Layout:
 *  - Sticky topbar: SolarPulse brand + breadcrumb + logout
 *  - Plant identity header
 *  - Date selector
 *  - Performance metrics row
 *  - Generation chart
 *  - AI insight card
 *  - Location card
 */

import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, LogOut, Zap } from 'lucide-react'
import { TOKEN_KEY } from '@/api/client'
import PerformanceDateSelector from '@/components/plant-detail/PerformanceDateSelector'
import PlantDetailErrorCard from '@/components/plant-detail/PlantDetailErrorCard'
import PlantDetailHeader from '@/components/plant-detail/PlantDetailHeader'
import AIInsightCard from '@/components/plant-detail/AIInsightCard'
import PerformanceChart from '@/components/plant-detail/PerformanceChart'
import PerformanceSummaryRow from '@/components/plant-detail/PerformanceSummaryRow'
import {
  PerformanceSummarySkeleton,
  PlantDetailPageSkeleton,
} from '@/components/plant-detail/PlantDetailSkeleton'
import LocationCard from '@/components/LocationCard'
import { usePlantDetail } from '@/hooks/usePlantDetail'
import { pageEntrance } from '@/lib/motion'

/* ── Helpers ────────────────────────────────────────────────────────── */
function parsePlantId(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) ? id : undefined
}

function parseDateParam(raw: string | null): string | undefined {
  if (!raw) return undefined
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined
}

/* ── Section label divider ──────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-[rgba(0,0,0,0.07)]" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════════════ */
export default function PlantDetailPage() {
  const navigate  = useNavigate()
  const { plantId: plantIdParam } = useParams<{ plantId: string }>()
  const [searchParams]            = useSearchParams()
  const plantId   = parsePlantId(plantIdParam)
  const initialDate = parseDateParam(searchParams.get('date'))

  const {
    plant, performance, selectedDate, setSelectedDate,
    isPlantLoading, isPerformanceLoading,
    plantError, performanceError,
    retryPlant, retryPerformance,
  } = usePlantDetail(plantId, initialDate)

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    navigate('/login', { replace: true })
  }

  /* ── Sticky topbar ────────────────────────────────────────────────── */
  const TopBar = (
    <header className="sticky top-0 z-30 border-b border-[rgba(0,0,0,0.07)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-14">

        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16A34A]">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden text-[14px] font-bold tracking-tight text-text-primary sm:block">SolarPulse</span>
          <span className="hidden mx-1 text-[12px] text-text-subtle sm:block">/</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex shrink-0 items-center gap-1 text-[12.5px] text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={13} />
            Fleet Overview
          </button>
          {plant && (
            <>
              <span className="shrink-0 text-[12px] text-text-subtle">/</span>
              <span className="truncate text-[12.5px] font-semibold text-text-primary">{plant.name}</span>
            </>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </header>
  )

  /* ── Invalid ID ───────────────────────────────────────────────────── */
  if (plantId === undefined) {
    return (
      <div className="min-h-screen bg-[#F7F7F3]">
        {TopBar}
        <div className="mx-auto max-w-6xl px-6 py-10">
          <PlantDetailErrorCard message="Invalid plant ID." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F3]">
      {TopBar}

      <motion.main
        className="mx-auto max-w-6xl px-6 py-8 pb-24"
        initial={pageEntrance.initial}
        animate={pageEntrance.animate}
        transition={pageEntrance.transition}
      >
        {/* Loading */}
        {isPlantLoading && <PlantDetailPageSkeleton />}

        {/* Plant-level error */}
        {!isPlantLoading && plantError && (
          <PlantDetailErrorCard message={plantError} onRetry={retryPlant} />
        )}

        {/* Main content */}
        {!isPlantLoading && !plantError && plant && (
          <>
            {/* Plant identity */}
            <PlantDetailHeader plant={plant} />

            {/* Date selector */}
            <PerformanceDateSelector
              value={selectedDate}
              onChange={setSelectedDate}
              disabled={isPerformanceLoading}
            />

            {/* Performance section */}
            <section className="mb-10">
              <SectionLabel>Performance Summary</SectionLabel>
              {isPerformanceLoading && <PerformanceSummarySkeleton />}
              {!isPerformanceLoading && performanceError && (
                <PlantDetailErrorCard message={performanceError} onRetry={retryPerformance} />
              )}
              {!isPerformanceLoading && !performanceError && performance && (
                <PerformanceSummaryRow performance={performance} />
              )}
            </section>

            {/* Generation chart */}
            {!performanceError && (
              <section className="mb-10">
                <SectionLabel>Generation Data</SectionLabel>
                <PerformanceChart
                  hourlyReadings={performance?.hourly_readings ?? []}
                  date={performance?.date ?? selectedDate}
                  isLoading={isPerformanceLoading}
                />
              </section>
            )}

            {/* AI insight */}
            <section className="mb-10">
              <SectionLabel>AI Analysis</SectionLabel>
              <AIInsightCard alertId={performance?.alert_id ?? null} />
            </section>

            {/* Location */}
            <section>
              <SectionLabel>Plant Location</SectionLabel>
              <LocationCard plant={plant} />
            </section>
          </>
        )}
      </motion.main>
    </div>
  )
}
