/**
 * Format fleet-wide CO₂ savings for KPI display.
 *
 * Uses kg for small totals and tonnes for larger values so the metric
 * stays readable on a compact dashboard card.
 */
export function formatFleetCo2Saved(totalKg: number): string {
  if (totalKg <= 0) return '0 t'

  const tonnes = totalKg / 1000

  if (tonnes < 1) {
    return `${totalKg.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg`
  }

  if (tonnes < 1000) {
    return `${tonnes.toLocaleString('en-US', { maximumFractionDigits: 1 })} t`
  }

  return `${(tonnes / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k t`
}
