import KPICard from '@/components/KPICard'
import { formatPrPct, formatRiskScore, formatSeverity } from '@/lib/performance'
import type { PerformanceSummary } from '@/types'

interface PerformanceSummaryRowProps {
  performance: PerformanceSummary
}

export default function PerformanceSummaryRow({ performance }: PerformanceSummaryRowProps) {
  const severity = formatSeverity(performance.severity)

  return (
    <section aria-label="Performance summary" className="mb-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          label="Performance Ratio"
          value={formatPrPct(performance.overall_pr_pct)}
        />
        <KPICard
          label="Risk Score"
          value={formatRiskScore(performance.risk_score)}
        />
        <KPICard
          label="Status"
          value={severity.label}
          status={severity.status}
        />
      </div>
    </section>
  )
}
