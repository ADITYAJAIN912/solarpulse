import { MapPin, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Plant } from '@/types'
import { cardHoverTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface PlantCardProps {
  plant: Plant
  onClick: () => void
}

function formatCreatedDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatCapacity(mw: number): string {
  return `${mw.toLocaleString('en-US', { maximumFractionDigits: 1 })} MW`
}

export default function PlantCard({ plant, onClick }: PlantCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      transition={cardHoverTransition}
      className={cn(
        'group w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-bg-surface p-5 text-left transition-colors',
        'hover:border-[var(--color-border-focus)] hover:bg-bg-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
      )}
    >
      <h2 className="text-base font-semibold text-text-primary group-hover:text-white">
        {plant.name}
      </h2>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{plant.location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{formatCapacity(plant.capacity_mw)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-subtle">
        Added {formatCreatedDate(plant.created_at)}
      </p>
    </motion.button>
  )
}
