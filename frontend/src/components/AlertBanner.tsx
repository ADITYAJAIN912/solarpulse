import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPlantPerformance } from '@/api/performance'
import SeverityBadge from '@/components/SeverityBadge'
import { formatRiskScore } from '@/lib/performance'
import { slideDownFadeVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Plant, Severity } from '@/types'

/**
 * Fixed demo date for fleet-wide alert surfacing.
 * Intentionally hardcoded so the dashboard banner consistently reflects
 * the seeded fault scenario (plant 2 on 2026-06-20). Replace with a
 * dynamic "latest evaluation date" once post-demo fleet aggregation exists.
 */
export const ALERT_BANNER_DEMO_DATE = '2026-06-20'

interface FlaggedPlant {
  plant: Plant
  severity: Extract<Severity, 'warning' | 'critical'>
  riskScore: number | null
}

export interface AlertBannerProps {
  plants: Plant[]
  className?: string
}

function isFlaggedSeverity(
  severity: Severity | null,
): severity is Extract<Severity, 'warning' | 'critical'> {
  return severity === 'warning' || severity === 'critical'
}

export default function AlertBanner({ plants, className }: AlertBannerProps) {
  const navigate = useNavigate()
  const [flaggedPlants, setFlaggedPlants] = useState<FlaggedPlant[]>([])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (plants.length === 0) {
      setFlaggedPlants([])
      setIsChecking(false)
      return
    }

    let cancelled = false
    setIsChecking(true)

    Promise.all(
      plants.map(async (plant) => {
        try {
          const performance = await getPlantPerformance(plant.id, ALERT_BANNER_DEMO_DATE)
          if (isFlaggedSeverity(performance.severity)) {
            return { plant, severity: performance.severity, riskScore: performance.risk_score }
          }
          return null
        } catch (error) {
          console.error(`AlertBanner: failed to fetch performance for plant ${plant.id}`, error)
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setFlaggedPlants(results.filter((r): r is FlaggedPlant => r !== null))
      setIsChecking(false)
    })

    return () => { cancelled = true }
  }, [plants])

  const plantCount = flaggedPlants.length
  const plantLabel = plantCount === 1 ? 'plant' : 'plants'
  const showBanner = !isChecking && flaggedPlants.length > 0

  function navigateToPlant(plantId: number) {
    navigate(`/plants/${plantId}?date=${ALERT_BANNER_DEMO_DATE}`)
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.section
          key="fleet-alert-banner"
          aria-label="Fleet performance alerts"
          variants={slideDownFadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            'overflow-hidden rounded-[var(--radius-card)] border border-amber-200/80 bg-amber-50',
            className,
          )}
        >
          {/* Header — clickable, goes to first flagged plant */}
          <button
            type="button"
            onClick={() => navigateToPlant(flaggedPlants[0].plant.id)}
            className="w-full px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Pulsing amber dot */}
                <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>

                <div>
                  <p className="text-sm font-semibold text-amber-900">Attention Required</p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    {plantCount} {plantLabel} operating below expected performance
                  </p>
                </div>
              </div>

              <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-700 sm:flex">
                Review AI Analysis
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </button>

          {/* Flagged plant rows */}
          {flaggedPlants.length > 0 && (
            <ul className="border-t border-amber-200/60 divide-y divide-amber-200/40">
              {flaggedPlants.map(({ plant, severity, riskScore }) => (
                <li key={plant.id}>
                  <button
                    type="button"
                    onClick={() => navigateToPlant(plant.id)}
                    className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors hover:bg-amber-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-amber-900">{plant.name}</p>
                      <p className="mt-0.5 text-xs text-amber-600">
                        Risk score {formatRiskScore(riskScore)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <SeverityBadge severity={severity} />
                      <ArrowRight className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
