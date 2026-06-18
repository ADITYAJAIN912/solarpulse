import { MapPin, Zap } from 'lucide-react'
import { formatCapacityMw } from '@/lib/performance'
import type { Plant } from '@/types'

interface PlantDetailHeaderProps {
  plant: Plant
}

export default function PlantDetailHeader({ plant }: PlantDetailHeaderProps) {
  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-widest text-text-muted">
        SolarPulse / Plant
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-text-primary">
        {plant.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {plant.location}
        </span>
        <span className="inline-flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatCapacityMw(plant.capacity_mw)}
        </span>
      </div>
    </header>
  )
}
