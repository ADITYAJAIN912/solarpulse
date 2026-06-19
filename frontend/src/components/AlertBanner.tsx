import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ChevronRight } from 'lucide-react'
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
            return {
              plant,
              severity: performance.severity,
              riskScore: performance.risk_score,
            }
          }
          return null
        } catch (error) {
          console.error(
            `AlertBanner: failed to fetch performance for plant ${plant.id}`,
            error,
          )
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setFlaggedPlants(
        results.filter((result): result is FlaggedPlant => result !== null),
      )
      setIsChecking(false)
    })

    return () => {
      cancelled = true
    }
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
            'rounded-[var(--radius-card)] border border-accent-amber/25 border-l-2 border-l-accent-amber bg-bg-surface px-5 py-4',
            className,
          )}
        >
      <button
        type="button"
        onClick={() => navigateToPlant(flaggedPlants[0].plant.id)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-badge)]"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber"
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary">Attention Required</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              {plantCount} {plantLabel} operating below expected performance
            </p>
          </div>

          <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-accent-amber sm:inline-flex">
            Review AI Analysis
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </button>

      <ul className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
        {flaggedPlants.map(({ plant, severity, riskScore }) => (
          <li key={plant.id}>
            <button
              type="button"
              onClick={() => navigateToPlant(plant.id)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-[var(--radius-badge)] px-2 py-2 text-left transition-colors',
                'hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{plant.name}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Risk score {formatRiskScore(riskScore)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <SeverityBadge severity={severity} />
                <ChevronRight className="h-3.5 w-3.5 text-text-subtle" aria-hidden />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => navigateToPlant(flaggedPlants[0].plant.id)}
        className="mt-3 flex w-full items-center justify-center gap-1 border-t border-[var(--color-border)] pt-3 text-xs font-medium text-accent-amber sm:hidden"
      >
        Review AI Analysis
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
