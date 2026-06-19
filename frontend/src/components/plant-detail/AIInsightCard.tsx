import { useEffect, useState } from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import { getAlert } from '@/api/alerts'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatConfidenceLabel,
  formatRootCause,
  formatSeverityLabel,
} from '@/lib/alert'
import { cn } from '@/lib/utils'
import type { Alert, Severity } from '@/types'

export interface AIInsightCardProps {
  alertId: number | null
  className?: string
}

const severityBadgeClass: Record<Severity, string> = {
  healthy:
    'border-accent-green/30 bg-accent-green-bg text-accent-green',
  warning:
    'border-accent-amber/30 bg-accent-amber-bg text-accent-amber',
  critical:
    'border-accent-red/30 bg-accent-red-bg text-accent-red',
}

const severityAccentBorder: Record<Severity, string> = {
  healthy: 'border-l-accent-green',
  warning: 'border-l-accent-amber',
  critical: 'border-l-accent-red',
}

const confidenceBadgeClass: Record<string, string> = {
  high: 'border-accent-green/30 bg-accent-green-bg text-accent-green',
  medium: 'border-accent-amber/30 bg-accent-amber-bg text-accent-amber',
  low: 'border-[var(--color-border)] bg-bg-hover text-text-muted',
}

function InsightBadge({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-badge)] border px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
    >
      {label}
    </span>
  )
}

function AIInsightCardSkeleton() {
  return (
    <div aria-label="Loading AI analysis" className="space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <Skeleton className="h-3 w-44" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-2 pl-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

function AIInsightCardError() {
  return (
    <div className="flex items-center gap-2.5 py-2 text-sm text-text-muted">
      <AlertCircle className="h-4 w-4 shrink-0 text-text-subtle" aria-hidden />
      <p>Unable to load analysis</p>
    </div>
  )
}

function AIInsightCardContent({ alert }: { alert: Alert }) {
  const severity = alert.severity
  const confidenceKey = alert.confidence_level ?? 'low'

  return (
    <>
      <header className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-text-subtle" aria-hidden />
        <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
          AI Root-Cause Analysis
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <InsightBadge
          label={formatRootCause(alert.root_cause)}
          className="border-[var(--color-border)] bg-bg-hover text-text-muted"
        />
        <InsightBadge
          label={`${formatConfidenceLabel(alert.confidence_level)} Confidence`}
          className={confidenceBadgeClass[confidenceKey] ?? confidenceBadgeClass.low}
        />
        <InsightBadge
          label={formatSeverityLabel(severity)}
          className={severityBadgeClass[severity]}
        />
      </div>

      <section className="mt-6">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
          Analysis
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-primary">
          {alert.ai_explanation ?? 'No analysis available.'}
        </p>
      </section>

      <div className="my-6 border-t border-[var(--color-border)]" />

      <section
        className={cn(
          'rounded-[var(--radius-badge)] border border-[var(--color-border)] border-l-2 bg-bg-base/50 px-4 py-3',
          severityAccentBorder[severity],
        )}
      >
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
          Recommended Action
        </h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-text-primary">
          {alert.suggested_action ?? 'No recommended action available.'}
        </p>
      </section>
    </>
  )
}

export default function AIInsightCard({ alertId, className }: AIInsightCardProps) {
  const [alert, setAlert] = useState<Alert | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (alertId === null) {
      setAlert(null)
      setIsLoading(false)
      setHasError(false)
      return
    }

    let cancelled = false

    setIsLoading(true)
    setHasError(false)
    setAlert(null)

    getAlert(alertId)
      .then((data) => {
        if (!cancelled) setAlert(data)
      })
      .catch(() => {
        if (!cancelled) setHasError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [alertId])

  if (alertId === null) return null

  return (
    <section
      aria-label="AI root-cause analysis"
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-bg-surface px-5 py-5',
        className,
      )}
    >
      {isLoading && <AIInsightCardSkeleton />}
      {!isLoading && hasError && <AIInsightCardError />}
      {!isLoading && !hasError && alert && <AIInsightCardContent alert={alert} />}
    </section>
  )
}
