import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { HourlyReading } from '@/types'

const CHART_HEIGHT = 340

const COLOR_ACTUAL = 'var(--color-accent-green)'
const COLOR_EXPECTED = 'rgba(255, 255, 255, 0.35)'
const COLOR_AXIS = 'var(--color-text-muted)'
const COLOR_GRID = 'rgba(255, 255, 255, 0.04)'

/** Highlight gap when actual falls more than 5% below expected. */
const GAP_THRESHOLD_PCT = 5

interface ChartDataPoint {
  hourLabel: string
  actual: number
  expected: number
}

export interface PerformanceChartProps {
  hourlyReadings: HourlyReading[]
  date: string
  isLoading?: boolean
  className?: string
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface PerformanceTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadEntry[]
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

function formatKwh(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} kWh`
}

function formatAxisKwh(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatChartDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00`))
}

function toChartData(readings: HourlyReading[]): ChartDataPoint[] {
  return [...readings]
    .sort((a, b) => a.hour - b.hour)
    .map((reading) => ({
      hourLabel: formatHourLabel(reading.hour),
      actual: reading.actual_output_kwh,
      expected: reading.expected_output_kwh,
    }))
}

function PerformanceTooltip({ active, label, payload }: PerformanceTooltipProps) {
  if (!active || !payload?.length || !label) return null

  const actual = payload.find((entry) => entry.dataKey === 'actual')?.value
  const expected = payload.find((entry) => entry.dataKey === 'expected')?.value

  if (actual === undefined || expected === undefined) return null

  const gap = expected - actual
  const gapPct = expected > 0 ? (gap / expected) * 100 : 0
  const showGap = gap > 0 && gapPct >= GAP_THRESHOLD_PCT

  return (
    <div
      className="rounded-[var(--radius-badge)] border border-[var(--color-border)] bg-bg-elevated px-3 py-2.5 shadow-sm"
      style={{ minWidth: 180 }}
    >
      <p className="mb-2 text-xs font-medium text-text-primary">{label}</p>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-text-muted">
            <span
              className="h-0.5 w-3 border-t-2 border-dashed"
              style={{ borderColor: COLOR_EXPECTED }}
              aria-hidden
            />
            Expected
          </span>
          <span className="tabular-nums text-text-primary">{formatKwh(expected)}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-text-muted">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: COLOR_ACTUAL }}
              aria-hidden
            />
            Actual
          </span>
          <span className="tabular-nums text-text-primary">{formatKwh(actual)}</span>
        </div>

        {showGap && (
          <div className="mt-1 border-t border-[var(--color-border)] pt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Gap</span>
              <span className="tabular-nums font-medium text-accent-amber">
                −{formatKwh(gap)} ({gapPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3" style={{ height: CHART_HEIGHT }} aria-hidden>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="flex-1 w-full rounded-[var(--radius-badge)]" />
    </div>
  )
}

function ChartEmptyState() {
  return (
    <div
      className="flex items-center justify-center text-sm text-text-muted"
      style={{ height: CHART_HEIGHT }}
    >
      No generation data available for this date
    </div>
  )
}

export default function PerformanceChart({
  hourlyReadings,
  date,
  isLoading = false,
  className,
}: PerformanceChartProps) {
  const chartData = toChartData(hourlyReadings)

  return (
    <section
      aria-label="Generation performance chart"
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-bg-surface px-5 py-5',
        className,
      )}
    >
      <header className="mb-5">
        <h2 className="text-sm font-semibold text-text-primary">Generation Performance</h2>
        <p className="mt-0.5 text-xs text-text-muted">{formatChartDate(date)}</p>
      </header>

      {isLoading ? (
        <ChartSkeleton />
      ) : chartData.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke={COLOR_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="hourLabel"
              tick={{ fill: COLOR_AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              dy={8}
            />
            <YAxis
              tick={{ fill: COLOR_AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisKwh}
              width={56}
            />
            <Tooltip content={<PerformanceTooltip />} cursor={{ stroke: 'var(--color-border-focus)', strokeWidth: 1 }} />
            <Legend
              verticalAlign="bottom"
              iconType="plainline"
              iconSize={16}
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value: string) => (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="expected"
              name="Expected Output"
              stroke={COLOR_EXPECTED}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, fill: COLOR_EXPECTED, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Output"
              stroke={COLOR_ACTUAL}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: COLOR_ACTUAL, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
