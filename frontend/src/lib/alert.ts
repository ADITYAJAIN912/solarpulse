import type { RootCause, Severity } from '@/types'

export function formatRootCause(value: RootCause | string | null): string {
  if (!value) return 'Unknown'
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatConfidenceLabel(value: string | null): string {
  if (!value) return 'Unknown'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatSeverityLabel(value: Severity): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
