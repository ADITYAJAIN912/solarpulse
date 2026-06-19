/**
 * Dashboard metric cards — production-grade data-first design.
 *
 * Design principles applied here:
 *  - White card, very subtle shadow, thin left-border accent (not gradient)
 *  - Number is the hero; label is small and secondary
 *  - Sparkline for trend context; ring for health percentage
 *  - Count-up animation on mount (professional, not flashy)
 *  - No decorative gradients, no heavy colors
 */

import { motion } from 'framer-motion'
import CapacityRing from '@/components/ui/CapacityRing'
import Sparkline from '@/components/ui/Sparkline'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

/* ── Shared card shell ──────────────────────────────────────────────── */
interface CardProps {
  children: React.ReactNode
  accentColor: string
  delay?: number
  className?: string
}

function MetricCard({ children, accentColor, delay = 0, className }: CardProps) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white',
        'shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200',
        className,
      )}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: EASE }}
    >
      {/* Left accent strip */}
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accentColor }} />
      <div className="px-5 py-5 pl-7">{children}</div>
    </motion.div>
  )
}

function MetricLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted">
      {children}
    </p>
  )
}

function MetricValue({
  children,
  color = 'text-text-primary',
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <p className={cn('nums mt-1.5 text-[2.4rem] font-black leading-none tracking-tight', color)}>
      {children}
    </p>
  )
}

function MetricFooter({ children }: { children: React.ReactNode }) {
  return <p className="mt-2.5 text-[11.5px] text-text-muted">{children}</p>
}

/* ── 1. Total Plants ────────────────────────────────────────────────── */
export function TotalPlantsCard({ count }: { count: number }) {
  const n = useCountUp(count)
  return (
    <MetricCard accentColor="#6366F1" delay={0}>
      <div className="flex items-start justify-between">
        <MetricLabel>Total Plants</MetricLabel>
        <Sparkline seed={7} color="#6366F1" width={56} height={22} />
      </div>
      <MetricValue>{Math.round(n)}</MetricValue>
      <MetricFooter>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          {count === 1 ? '1 plant registered' : `${count} plants registered`}
        </span>
      </MetricFooter>
    </MetricCard>
  )
}

/* ── 2. Installed Capacity ──────────────────────────────────────────── */
export function CapacityCard({ totalMw, maxMw = 500 }: { totalMw: number; maxMw?: number }) {
  const n   = useCountUp(totalMw)
  const pct = Math.min(100, (totalMw / maxMw) * 100)

  return (
    <MetricCard accentColor="#16A34A" delay={0.07}>
      <div className="flex items-start justify-between">
        <MetricLabel>Installed Capacity</MetricLabel>
        <Sparkline seed={3} color="#16A34A" width={56} height={22} />
      </div>
      <MetricValue>
        {n.toFixed(1)}
        <span className="ml-1.5 text-[1.3rem] font-bold text-text-muted">MW</span>
      </MetricValue>

      {/* Progress bar */}
      <div className="mt-3 space-y-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.06)]">
          <motion.div
            className="h-full rounded-full bg-[#16A34A]"
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          />
        </div>
        <MetricFooter>{pct.toFixed(0)}% of {maxMw} MW capacity target</MetricFooter>
      </div>
    </MetricCard>
  )
}

/* ── 3. Fleet Health ────────────────────────────────────────────────── */
export function FleetHealthCard({
  healthPct = 100,
  label = 'Healthy',
}: {
  healthPct?: number
  label?: string
}) {
  const n = useCountUp(healthPct)
  return (
    <MetricCard accentColor="#10B981" delay={0.14}>
      <div className="flex items-start justify-between">
        <div>
          <MetricLabel>Fleet Health</MetricLabel>
          <MetricValue>{Math.round(n)}%</MetricValue>
          <MetricFooter>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {label} — all systems nominal
            </span>
          </MetricFooter>
        </div>
        <CapacityRing
          percentage={healthPct}
          size={60}
          strokeWidth={4.5}
          color="#10B981"
          trackColor="rgba(16,185,129,0.10)"
        />
      </div>
    </MetricCard>
  )
}

/* ── 4. CO₂ Avoided ─────────────────────────────────────────────────── */
export function Co2SavedCard({
  tonnes,
  isLoading,
}: {
  tonnes: number | null
  isLoading: boolean
}) {
  const n = useCountUp(tonnes ?? 0, { enabled: !isLoading && tonnes !== null })

  return (
    <MetricCard accentColor="#16A34A" delay={0.21}>
      <div className="flex items-start justify-between">
        <MetricLabel>CO₂ Avoided</MetricLabel>
        <Sparkline seed={11} color="#16A34A" width={56} height={22} />
      </div>

      {isLoading ? (
        <Skeleton className="mt-1.5 h-10 w-28" />
      ) : (
        <MetricValue>
          {n.toFixed(1)}
          <span className="ml-1.5 text-[1.3rem] font-bold text-text-muted">t</span>
        </MetricValue>
      )}

      <MetricFooter>
        {!isLoading && tonnes !== null
          ? `≈ ${Math.round(tonnes * 45)} trees planted equivalent`
          : 'Loading sustainability data…'}
      </MetricFooter>
    </MetricCard>
  )
}
