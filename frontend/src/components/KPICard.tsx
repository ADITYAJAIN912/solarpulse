import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { blurInVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type KPIStatus = 'healthy' | 'warning' | 'critical'

export interface KPICardProps {
  label: string
  value: string
  hint?: string
  status?: KPIStatus
  className?: string
  adornment?: ReactNode
  isLoading?: boolean
  /** Icon displayed in the top-right corner of the card */
  icon?: ReactNode
}

const statusAccentClass: Record<KPIStatus, string> = {
  healthy: 'bg-accent-green',
  warning: 'bg-accent-amber',
  critical: 'bg-accent-red',
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
  isLoading = false,
  icon,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[var(--radius-card)] bg-bg-surface px-6 py-5',
        'shadow-[0_1px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
        'transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          {label}
        </p>
        {icon && (
          <span className="text-text-subtle transition-colors duration-200 group-hover:text-text-muted">
            {icon}
          </span>
        )}
      </div>

      {/* Value row */}
      <div className="mt-4 flex items-baseline gap-2.5">
        {status && (
          <span
            className={cn('mb-0.5 h-2 w-2 shrink-0 rounded-full', statusDotClass[status])}
            aria-hidden
          />
        )}
        {isLoading ? (
          <Skeleton className="h-9 w-20" aria-label="Loading" />
        ) : (
          <motion.p
            className="text-3xl font-bold tracking-tight text-text-primary tabular-nums"
            variants={blurInVariants}
            initial="initial"
            animate="animate"
            key={value}
          >
            {value}
          </motion.p>
        )}
        {adornment}
      </div>

      {hint && (
        <p className="mt-2 text-xs text-text-subtle">{hint}</p>
      )}

      {/* Sliding accent line — extends across card bottom on hover */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-[2.5px] w-0 transition-all duration-500 ease-out group-hover:w-full',
          status ? statusAccentClass[status] : 'bg-accent-green',
        )}
        aria-hidden
      />
    </div>
  )
}
