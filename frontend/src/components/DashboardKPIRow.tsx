import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getPlantSustainability } from '@/api/sustainability'
import {
  CapacityCard,
  Co2SavedCard,
  FleetHealthCard,
  TotalPlantsCard,
} from '@/components/DashboardKPICards'
import { fadeInUpVariants, staggerContainerVariants } from '@/lib/motion'
import type { Plant } from '@/types'

interface DashboardKPIRowProps {
  plants: Plant[]
}

export default function DashboardKPIRow({ plants }: DashboardKPIRowProps) {
  const [totalCo2Kg, setTotalCo2Kg] = useState<number | null>(null)
  const [isCo2Loading, setIsCo2Loading] = useState(true)

  const totalMw = plants.reduce((sum, p) => sum + p.capacity_mw, 0)

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
          const s = await getPlantSustainability(plant.id)
          return s.co2_saved_kg
        } catch (err) {
          console.error(`DashboardKPIRow: sustainability fetch failed for plant ${plant.id}`, err)
          return 0
        }
      }),
    ).then((vals) => {
      if (cancelled) return
      setTotalCo2Kg(vals.reduce((a, b) => a + b, 0))
      setIsCo2Loading(false)
    })

    return () => { cancelled = true }
  }, [plants])

  return (
    <section aria-label="Fleet overview" className="mb-8">
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={fadeInUpVariants}>
          <TotalPlantsCard count={plants.length} />
        </motion.div>

        <motion.div variants={fadeInUpVariants}>
          <CapacityCard totalMw={totalMw} plantCount={plants.length} />
        </motion.div>

        <motion.div variants={fadeInUpVariants}>
          <FleetHealthCard
            healthPct={plants.length === 0 ? 0 : 100}
            label={plants.length === 0 ? 'No data' : 'Healthy'}
          />
        </motion.div>

        <motion.div variants={fadeInUpVariants}>
          <Co2SavedCard tonnes={totalCo2Kg !== null ? totalCo2Kg / 1000 : null} isLoading={isCo2Loading} />
        </motion.div>
      </motion.div>
    </section>
  )
}
