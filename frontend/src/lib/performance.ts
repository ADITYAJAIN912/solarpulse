import type { KPIStatus } from '@/components/KPICard'
import type { Severity } from '@/types'

export function formatPrPct(value: number | null): string {
  if (value === null) return '--'
  return `${value.toFixed(1)}%`
}

export function formatRiskScore(value: number | null): string {
  if (value === null) return '--'
  return value.toLocaleString('en-US')
}

export function formatSeverity(value: Severity | null): {
  label: string
  status?: KPIStatus
} {
  if (!value) return { label: '--' }
  return {
    label: value.charAt(0).toUpperCase() + value.slice(1),
    status: value,
  }
}

export function formatCapacityMw(mw: number): string {
  return `${mw.toLocaleString('en-US', { maximumFractionDigits: 1 })} MW`
}
