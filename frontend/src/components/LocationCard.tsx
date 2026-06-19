/**
 * LocationCard — geographic context card for a plant or fleet.
 *
 * Replaces the Leaflet map with a data-rich, on-brand card that shows:
 *  - Coordinates with compass-rose SVG
 *  - Region / climate / irradiance data
 *  - An animated desert-horizon SVG scene
 *  - Desert thermal stats strip
 */

import { motion } from 'framer-motion'
import { MapPin, Sun, Wind, Thermometer, Compass } from 'lucide-react'
import type { Plant } from '@/types'

/* ── Animated desert horizon SVG ────────────────────────────────────── */
function DesertScene() {
  return (
    <svg
      viewBox="0 0 480 120"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ height: 120 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#FCD34D" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id="sunGlow2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#FCD34D" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="480" height="78" fill="url(#skyGrad)" />

      {/* Sun glow */}
      <circle cx="400" cy="32" r="38" fill="url(#sunGlow2)" />
      {/* Sun */}
      <circle cx="400" cy="32" r="14" fill="#F59E0B" opacity="0.9" />
      <circle cx="400" cy="32" r="10" fill="#FCD34D" />

      {/* Animated sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x1 = 400 + 17 * Math.cos(rad)
        const y1 = 32  + 17 * Math.sin(rad)
        const x2 = 400 + 26 * Math.cos(rad)
        const y2 = 32  + 26 * Math.sin(rad)
        return (
          <line
            key={deg}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"
            style={{
              animation: `ray-blink 2.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.75,
            }}
          />
        )
      })}

      {/* Far dunes */}
      <path
        d="M0,78 Q60,55 120,68 Q180,80 240,60 Q300,42 360,62 Q420,78 480,65 L480,120 L0,120 Z"
        fill="#FDE68A" opacity="0.45"
      />

      {/* Near dunes */}
      <path
        d="M0,90 Q80,70 160,82 Q240,94 320,72 Q380,56 480,78 L480,120 L0,120 Z"
        fill="url(#sandGrad)"
      />

      {/* Solar panel silhouettes on dune */}
      {[60, 130, 200, 270, 340].map((x, i) => (
        <g key={i} transform={`translate(${x}, 80)`}>
          {/* Pole */}
          <rect x="-1" y="0" width="2" height="12" fill="#92400E" opacity="0.4" />
          {/* Panel */}
          <rect
            x="-14" y="-8" width="28" height="10"
            rx="1.5"
            fill="#1E3A8A"
            stroke="#3B82F6"
            strokeWidth="0.8"
            opacity="0.75"
            transform="rotate(-15)"
          />
          {/* Cell lines */}
          <line x1="-5" y1="-8" x2="-5" y2="2" stroke="#60A5FA" strokeWidth="0.5" opacity="0.5" transform="rotate(-15)" />
          <line x1="5"  y1="-8" x2="5"  y2="2" stroke="#60A5FA" strokeWidth="0.5" opacity="0.5" transform="rotate(-15)" />
        </g>
      ))}

      {/* Location pin */}
      <g transform="translate(54, 40)">
        <circle cx="0" cy="0" r="10" fill="#16A34A" opacity="0.15" />
        <circle cx="0" cy="0" r="5"  fill="#16A34A" opacity="0.9" />
        <circle cx="0" cy="0" r="2.5" fill="white" />
      </g>
      <text x="70" y="44" fontSize="9" fill="#15803D" fontWeight="700" fontFamily="'Space Grotesk',sans-serif">
        Jaisalmer Solar Zone
      </text>
    </svg>
  )
}

/* ── Compass rose SVG ────────────────────────────────────────────────── */
function CompassRose({ size = 52 }: { size?: number }) {
  const c = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={c} cy={c} r={c - 2} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
      {/* N arrow */}
      <path d={`M ${c} ${c - 16} L ${c - 5} ${c} L ${c} ${c - 5} L ${c + 5} ${c} Z`} fill="#16A34A" />
      {/* S arrow */}
      <path d={`M ${c} ${c + 16} L ${c - 5} ${c} L ${c} ${c + 5} L ${c + 5} ${c} Z`} fill="rgba(0,0,0,0.12)" />
      {/* E/W marks */}
      <circle cx={c} cy={c} r="3" fill="white" stroke="#16A34A" strokeWidth="1.5" />
      {['N','S','E','W'].map((dir, i) => {
        const angles = [-Math.PI/2, Math.PI/2, 0, Math.PI]
        const tx = c + Math.cos(angles[i]) * (c - 5)
        const ty = c + Math.sin(angles[i]) * (c - 5) + 0.5
        return (
          <text key={dir} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fontWeight="800" fill={dir === 'N' ? '#16A34A' : '#94A3B8'}
            fontFamily="'Space Grotesk',sans-serif">
            {dir}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Stat chip ──────────────────────────────────────────────────────── */
function StatChip({
  icon,
  label,
  value,
  color = '#16A34A',
}: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(0,0,0,0.07)] bg-white px-4 py-3 shadow-sm">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}14`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
        <p className="text-[13px] font-bold text-text-primary">{value}</p>
      </div>
    </div>
  )
}

/* ── Props ──────────────────────────────────────────────────────────── */
interface LocationCardProps {
  /** Pass a single plant for plant-detail view, omit for fleet view */
  plant?: Plant
  className?: string
}

export default function LocationCard({ plant, className = '' }: LocationCardProps) {
  const lat  = plant?.latitude  ?? 26.9124
  const lng  = plant?.longitude ?? 70.9130
  const name = plant?.name ?? 'Solar Fleet'

  const latDir = lat  >= 0 ? 'N' : 'S'
  const lngDir = lng  >= 0 ? 'E' : 'W'

  return (
    <motion.section
      aria-label="Location information"
      className={`overflow-hidden rounded-[var(--radius-card)] border border-[rgba(0,0,0,0.08)] bg-white shadow-sm ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
            <MapPin size={15} className="text-green-600" />
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted">
              {plant ? 'Plant Location' : 'Fleet Geography'}
            </p>
            <p className="text-[13.5px] font-semibold text-text-primary">{name}</p>
          </div>
        </div>
        <CompassRose size={48} />
      </div>

      {/* ── Desert horizon scene ─────────────────────────────────── */}
      <div className="border-b border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-amber-50/60 to-white/40">
        <DesertScene />
      </div>

      {/* ── Coordinate display ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-6 px-5 py-4">
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Latitude</p>
            <p className="nums mt-0.5 text-[1.6rem] font-black leading-none tracking-tight text-text-primary">
              {Math.abs(lat).toFixed(4)}°
              <span className="ml-1 text-[1rem] font-bold text-green-600">{latDir}</span>
            </p>
          </div>
          <div className="w-px self-stretch bg-[rgba(0,0,0,0.07)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Longitude</p>
            <p className="nums mt-0.5 text-[1.6rem] font-black leading-none tracking-tight text-text-primary">
              {Math.abs(lng).toFixed(4)}°
              <span className="ml-1 text-[1rem] font-bold text-indigo-500">{lngDir}</span>
            </p>
          </div>
        </div>

        {/* Region badge */}
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Thar Desert, Rajasthan
          </span>
          <p className="mt-1 text-[10.5px] text-text-subtle">Elevation ~225 m ASL</p>
        </div>
      </div>

      {/* ── Regional reference stats ──────────────────────────────── */}
      <div className="border-t border-[rgba(0,0,0,0.05)] bg-amber-50/40 px-5 py-2 flex items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700/70">Regional climate reference</span>
        <span className="text-[9px] text-amber-600/50">· Thar Desert solar corridor · not live sensor data</span>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pb-5 pt-3 sm:grid-cols-4">
        <StatChip icon={<Sun size={15} />}         label="Avg. Regional GHI" value="6.2 kWh/m²" color="#D97706" />
        <StatChip icon={<Thermometer size={15} />} label="Typical Temp"      value="~38°C"       color="#EA580C" />
        <StatChip icon={<Wind size={15} />}         label="Avg. Wind"         value="~14 km/h"    color="#6366F1" />
        <StatChip icon={<Compass size={15} />}      label="Climate Zone"      value="Hot Arid"    color="#16A34A" />
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="border-t border-[rgba(0,0,0,0.05)] bg-[#FAFAF8] px-5 py-2.5">
        <p className="text-[10.5px] text-text-subtle">
          📍 Jaisalmer Solar Zone · India's highest solar irradiance corridor ·
          Avg 325 sunny days/year
        </p>
      </div>
    </motion.section>
  )
}
