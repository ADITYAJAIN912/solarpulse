import KPICard from '@/components/KPICard'
import type { Plant } from '@/types'

interface DashboardKPIRowProps {
  plants: Plant[]
}

function formatFleetCapacity(mw: number): string {
  return `${mw.toLocaleString('en-US', { maximumFractionDigits: 1 })} MW`
}

export default function DashboardKPIRow({ plants }: DashboardKPIRowProps) {
  const totalPlants = plants.length
  const installedCapacityMw = plants.reduce((sum, plant) => sum + plant.capacity_mw, 0)

  return (
    <section aria-label="Fleet overview" className="mb-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Plants"
          value={totalPlants.toLocaleString('en-US')}
        />

        <KPICard
          label="Installed Capacity"
          value={formatFleetCapacity(installedCapacityMw)}
        />

        <KPICard
          label="Fleet Health"
          value="Healthy"
          status="healthy"
        />

        <KPICard
          label="CO₂ Saved"
          value="--"
          hint="Sustainability aggregation will connect here"
        />
      </div>
    </section>
  )
}
