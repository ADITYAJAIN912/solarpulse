/**
 * PlantCard — production-grade plant summary card.
 *
 * Shows only real data: name, location, capacity, fleet share, active status.
 * No pseudo/fabricated metrics. Clean typography hierarchy.
 * 3-D tilt via TiltCard on hover; capacity bar animates on mount.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, MapPin, UploadCloud, Zap } from 'lucide-react'
import Sparkline from '@/components/ui/Sparkline'
import TiltCard from '@/components/ui/TiltCard'
import { UploadReadingsModal } from '@/components/readings/UploadReadingsModal'
import { useCountUp } from '@/hooks/useCountUp'
import type { Plant } from '@/types'

/* One palette per card index — accent only, card is always white */
const ACCENTS = ['#6366F1', '#16A34A', '#EA580C', '#3B82F6', '#A855F7', '#D97706']

const EASE = [0.22, 1, 0.36, 1] as const

interface PlantCardProps {
  plant: Plant
  index: number
  totalCapacityMw: number
  onClick?: () => void
}

export default function PlantCard({ plant, index, totalCapacityMw, onClick }: PlantCardProps) {
  const accent       = ACCENTS[index % ACCENTS.length]
  const sharePercent = totalCapacityMw > 0 ? (plant.capacity_mw / totalCapacityMw) * 100 : 0
  const capacityAnim = useCountUp(plant.capacity_mw, { duration: 0.9 })
  const [uploadOpen, setUploadOpen] = useState(false)

  const sinceDate = new Intl.DateTimeFormat('en-US', {
    month: 'short', year: 'numeric',
  }).format(new Date(plant.created_at))

  return (
    <>
    <UploadReadingsModal
      plantId={plant.id}
      plantName={plant.name}
      open={uploadOpen}
      onClose={() => setUploadOpen(false)}
    />
    <TiltCard maxTilt={5} className="h-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        className={`
          group relative flex h-full cursor-pointer flex-col overflow-hidden
          rounded-xl border border-[rgba(0,0,0,0.08)] bg-white
          shadow-[0_1px_3px_rgba(0,0,0,0.05)]
          hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]
          transition-shadow duration-200 outline-none
          focus-visible:ring-2 focus-visible:ring-offset-2
        `}
        style={{ '--tw-ring-color': accent } as React.CSSProperties}
      >
        {/* Top accent bar */}
        <div className="h-[2.5px] w-full" style={{ background: accent }} />

        <div className="flex flex-1 flex-col p-5">

          {/* ── Header: avatar + name + sparkline ─────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[0.95rem] font-black text-white"
                style={{ background: accent }}
              >
                {plant.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[14px] font-bold text-text-primary leading-tight">
                  {plant.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-text-muted">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{plant.location}</span>
                </p>
              </div>
            </div>
            <Sparkline seed={plant.id + index} color={accent} width={50} height={22} />
          </div>

          {/* ── Capacity ──────────────────────────────────────────── */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
              Installed Capacity
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="nums text-[2.2rem] font-black leading-none tracking-tight"
                style={{ color: accent }}
              >
                {capacityAnim.toFixed(1)}
              </span>
              <span className="text-[1rem] font-bold text-text-muted">MW</span>
            </div>
          </div>

          {/* ── Fleet-share bar ───────────────────────────────────── */}
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>Fleet share</span>
              <span className="nums font-semibold">{sharePercent.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.05)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent }}
                initial={{ width: '0%' }}
                animate={{ width: `${sharePercent}%` }}
                transition={{ duration: 0.85, delay: 0.15 + index * 0.06, ease: EASE }}
              />
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
              <Zap size={11} style={{ color: '#22c55e' }} />
              <span>Active since {sinceDate}</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setUploadOpen(true) }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-text-muted hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Upload readings"
            >
              <UploadCloud size={11} /> Upload
            </button>

            {/* Arrow — slides in on group hover */}
            <motion.div
              className="flex items-center gap-0.5 text-[11.5px] font-semibold"
              style={{ color: accent }}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 0, x: -4 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              View <ArrowUpRight size={12} />
            </motion.div>
          </div>

          {/* Hover "View" arrow — always revealed by parent hover */}
          <div
            className="pointer-events-none absolute bottom-5 right-5 flex items-center gap-0.5 text-[11.5px] font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ color: accent }}
          >
            View <ArrowUpRight size={12} />
          </div>
        </div>
      </div>
    </TiltCard>
    </>
  )
}
