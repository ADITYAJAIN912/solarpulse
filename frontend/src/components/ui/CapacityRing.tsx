import { motion } from 'framer-motion'

interface CapacityRingProps {
  /** 0–100 */
  percentage: number
  color?: string
  trackColor?: string
  size?: number
  strokeWidth?: number
  label?: string
}

/**
 * Animated SVG ring.  The stroke animates from 0 to the target arc length
 * using framer-motion's spring-like ease — the same technique used by
 * award-winning dashboards like Stripe and Datadog.
 */
export default function CapacityRing({
  percentage,
  color = 'var(--color-accent-green)',
  trackColor = 'rgba(0,0,0,0.06)',
  size = 48,
  strokeWidth = 4,
  label,
}: CapacityRingProps) {
  const r = size / 2 - strokeWidth
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(Math.max(percentage, 0), 100) / 100)
  const cx = size / 2
  const cy = size / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={label ?? `${Math.round(percentage)}%`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Animated fill arc */}
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />
    </svg>
  )
}
