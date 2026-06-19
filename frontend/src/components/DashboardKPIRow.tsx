import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getPlantSustainability } from '@/api/sustainability'
import KPICard from '@/components/KPICard'
import { fadeInUpVariants, staggerContainerVariants } from '@/lib/motion'
import { formatFleetCo2Saved } from '@/lib/sustainability'
import type { Plant } from '@/types'

interface DashboardKPIRowProps {
  plants: Plant[]
}

function formatFleetCapacity(mw: number): string {
  return `${mw.toLocaleString('en-US', { maximumFractionDigits: 1 })} MW`
}

export default function DashboardKPIRow({ plants }: DashboardKPIRowProps) {
  const [totalCo2Kg, setTotalCo2Kg] = useState<number | null>(null)
  const [isCo2Loading, setIsCo2Loading] = useState(true)

  const totalPlants = plants.length
  const installedCapacityMw = plants.reduce((sum, plant) => sum + plant.capacity_mw, 0)

  useEffect(() => {
    if (plants.length === 0) {
      setTotalCo2Kg(0)
      setIsCo2Loading(false)
      return
    }

    let cancelled = false
    setIsCo2Loading(true)

    Promise.all(
      plants.map(async (plant) => {
        try {
          const summary = await getPlantSustainability(plant.id)
          return summary.co2_saved_kg
        } catch (error) {
          console.error(
            `DashboardKPIRow: failed to fetch sustainability for plant ${plant.id}`,
            error,
          )
          return 0
        }
      }),
    ).then((contributions) => {
      if (cancelled) return
      setTotalCo2Kg(contributions.reduce((sum, kg) => sum + kg, 0))
      setIsCo2Loading(false)
    })

    return () => {
      cancelled = true
    }
  }, [plants])

  return (
    <section aria-label="Fleet overview" className="mb-10">
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={fadeInUpVariants}>
          <KPICard
            label="Total Plants"
            value={totalPlants.toLocaleString('en-US')}
          />
        </motion.div>

        <motion.div variants={fadeInUpVariants}>
          <KPICard
            label="Installed Capacity"
            value={formatFleetCapacity(installedCapacityMw)}
          />
        </motion.div>

        <motion.div variants={fadeInUpVariants}>
          <KPICard
            label="Fleet Health"
            value="Healthy"
            status="healthy"
          />
        </motion.div>

        <motion.div variants={fadeInUpVariants}>
          <KPICard
            label="CO₂ Saved"
            value={totalCo2Kg === null ? '—' : formatFleetCo2Saved(totalCo2Kg)}
            hint={isCo2Loading ? undefined : 'Lifetime fleet emissions offset'}
            isLoading={isCo2Loading}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
