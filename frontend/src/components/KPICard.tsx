import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type KPIStatus = 'healthy' | 'warning' | 'critical'

export interface KPICardProps {
  label: string
  value: string
  /** Optional secondary line — e.g. pending-integration note */
  hint?: string
  /** Renders a coloured status dot beside the value */
  status?: KPIStatus
  className?: string
  /** Optional trailing content aligned with the value row */
  adornment?: ReactNode
}

const statusDotClass: Record<KPIStatus, string> = {
  healthy: 'bg-accent-green',
  warning: 'bg-accent-amber',
  critical: 'bg-accent-red',
}

export default function KPICard({
  label,
  value,
  hint,
  status,
  className,
  adornment,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-bg-surface px-5 py-4 transition-colors hover:border-[var(--color-border-focus)] hover:bg-bg-hover',
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
        {label}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {status && (
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass[status])}
            aria-hidden
          />
        )}
        <p className="text-2xl font-semibold tracking-tight text-text-primary tabular-nums">
          {value}
        </p>
        {adornment}
      </div>

      {hint && (
        <p className="mt-2 text-xs text-text-subtle">{hint}</p>
      )}
    </div>
  )
}
