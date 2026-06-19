import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CloudOff, Sparkles } from 'lucide-react'
import { getAlert } from '@/api/alerts'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatConfidenceLabel,
  formatRootCause,
  formatSeverityLabel,
} from '@/lib/alert'
import { contentFadeVariants } from '@/lib/motion'
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

/**
 * Detect whether an alert contains a fallback (non-AI) response.
 * Handles both:
 *  1. Alerts stored after the fix: root_cause=unknown, confidence=low
 *  2. Old alerts stored before the fix: raw API error text in ai_explanation
 */
function isFallbackAlert(alert: Alert): boolean {
  const explanation = alert.ai_explanation ?? ''
  const hasRawApiError =
    explanation.includes('429') ||
    explanation.includes('quota') ||
    explanation.includes('billing') ||
    explanation.includes('API key')
  const isFallbackFields =
    alert.root_cause === 'unknown' && alert.confidence_level === 'low'
  return hasRawApiError || isFallbackFields
}

/* ── AI unavailable state ───────────────────────────────────────────── */
function AIUnavailablePanel({ alert }: { alert: Alert }) {
  const isQuotaIssue =
    (alert.ai_explanation ?? '').includes('429') ||
    (alert.ai_explanation ?? '').includes('quota') ||
    (alert.ai_explanation ?? '').includes('billing')

  return (
    <div>
      <header className="flex items-center gap-2 mb-4">
        <Sparkles className="h-3.5 w-3.5 text-text-subtle" aria-hidden />
        <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
          AI Root-Cause Analysis
        </p>
      </header>

      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#FAFAF8] px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-200">
            <CloudOff className="h-4 w-4 text-amber-600" aria-hidden />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-text-primary">
              AI Analysis Unavailable
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">
              {isQuotaIssue
                ? 'The Gemini API free-tier quota was exceeded when this alert was generated. The fault data above is real — AI explanation is temporarily unavailable.'
                : 'Automated analysis could not be generated for this alert. The performance data above is accurate.'}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-[rgba(0,0,0,0.06)] pt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted mb-2">
            Manual Investigation Steps
          </p>
          <ol className="space-y-1.5 text-[12.5px] text-text-muted">
            {[
              'Compare Inverter A vs Inverter B output in the chart above — a single-inverter dip points to hardware, not weather.',
              'Check event logs for the flagged hours for tripped breakers or DC disconnect alarms.',
              'Inspect panels for soiling or physical obstruction if the dip follows peak sun hours.',
              isQuotaIssue
                ? 'To restore AI analysis: add billing to your Gemini account, or wait for the daily quota to reset (midnight PST).'
                : 'Re-run the performance evaluation after resolving the issue to regenerate the AI analysis.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(0,0,0,0.07)] text-[9px] font-bold text-text-muted">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {isQuotaIssue && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] text-amber-700 ring-1 ring-amber-200">
            Severity badge and performance metrics above are calculated from real sensor data — only the AI narrative is missing.
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Full AI analysis content ───────────────────────────────────────── */
function AIInsightCardContent({ alert }: { alert: Alert }) {
  if (isFallbackAlert(alert)) {
    return <AIUnavailablePanel alert={alert} />
  }

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
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="insight-skeleton"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
          >
            <AIInsightCardSkeleton />
          </motion.div>
        )}

        {!isLoading && hasError && (
          <motion.div
            key="insight-error"
            variants={contentFadeVariants}
            initial="initial"
            animate="animate"
          >
            <AIInsightCardError />
          </motion.div>
        )}

        {!isLoading && !hasError && alert && (
          <motion.div
            key="insight-content"
            variants={contentFadeVariants}
            initial="initial"
            animate="animate"
          >
            <AIInsightCardContent alert={alert} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
