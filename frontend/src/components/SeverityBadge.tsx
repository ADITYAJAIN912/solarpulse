import { cn } from '@/lib/utils'
import { formatSeverityLabel } from '@/lib/alert'
import type { Severity } from '@/types'

const severityBadgeClass: Record<Severity, string> = {
  healthy: 'border-accent-green/30 bg-accent-green-bg text-accent-green',
  warning: 'border-accent-amber/30 bg-accent-amber-bg text-accent-amber',
  critical: 'border-accent-red/30 bg-accent-red-bg text-accent-red',
}

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

export default function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-badge)] border px-2 py-0.5 text-[11px] font-medium',
        severityBadgeClass[severity],
        className,
      )}
    >
      {formatSeverityLabel(severity)}
    </span>
  )
}
