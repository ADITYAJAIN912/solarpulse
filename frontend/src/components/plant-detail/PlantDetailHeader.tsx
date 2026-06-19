/**
 * PlantDetailHeader — compact plant identity block.
 * Shows name, location chip, capacity badge, and online status.
 */

import { MapPin, Zap } from 'lucide-react'
import { formatCapacityMw } from '@/lib/performance'
import type { Plant } from '@/types'

interface PlantDetailHeaderProps {
  plant: Plant
}

export default function PlantDetailHeader({ plant }: PlantDetailHeaderProps) {
  return (
    <div className="mb-8 pb-6 border-b border-[rgba(0,0,0,0.07)]">
      {/* Status row */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
          </span>
          Operational
        </span>
        <span className="text-[11px] text-text-subtle">
          ID #{plant.id}
        </span>
      </div>

      {/* Plant name */}
      <h1 className="text-[1.75rem] font-bold tracking-tight text-text-primary">
        {plant.name}
      </h1>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F3] px-3 py-1 text-[12px] font-medium text-text-muted">
          <MapPin size={12} />
          {plant.location}
        </span>
        <span className="flex items-center gap-1.5 rounded-lg bg-[#F0FDF4] px-3 py-1 text-[12px] font-semibold text-green-700">
          <Zap size={12} />
          {formatCapacityMw(plant.capacity_mw)}
        </span>
        <span className="text-[11.5px] text-text-subtle">
          {plant.latitude.toFixed(4)}° N, {plant.longitude.toFixed(4)}° E
        </span>
      </div>
    </div>
  )
}
