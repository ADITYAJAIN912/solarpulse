interface SparklineProps {
  /** Seed used to deterministically generate decorative data */
  seed: number
  color?: string
  width?: number
  height?: number
}

/**
 * Pure-SVG mini area chart.  Uses a seeded mathematical function to
 * generate consistent decorative data — no real time-series needed.
 * Gradient fill + subtle line + endpoint dot.
 */
export default function Sparkline({
  seed,
  color = '#16A34A',
  width = 80,
  height = 32,
}: SparklineProps) {
  const n = 10

  const raw = Array.from({ length: n }, (_, i) => {
    const v =
      0.5 +
      Math.sin(seed * 2.1 + i * 1.73) * 0.28 +
      Math.cos(seed * 0.9 + i * 0.6) * 0.15 +
      Math.sin(i * 0.4 + seed) * 0.07
    return Math.max(0.04, Math.min(0.96, v))
  })

  const points = raw.map((v, i) => ({
    x: (i / (n - 1)) * width,
    y: (1 - v) * height,
  }))

  const line = points.map((p) => `${p.x},${p.y}`).join(' ')

  const first = points[0]
  const last = points[points.length - 1]
  const area = [
    `M ${first.x},${height}`,
    ...points.map((p) => `L ${p.x},${p.y}`),
    `L ${last.x},${height}`,
    'Z',
  ].join(' ')

  const gradId = `spark-grad-${seed}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={area} fill={`url(#${gradId})`} />

      {/* Line */}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* Endpoint dot */}
      <circle cx={last.x} cy={last.y} r="3" fill={color} opacity="0.9" />
    </svg>
  )
}
