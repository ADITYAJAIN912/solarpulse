import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPlants } from '@/api/plants'
import DashboardKPIRow from '@/components/DashboardKPIRow'
import PlantCard from '@/components/PlantCard'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/errors'
import type { Plant } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [plants, setPlants] = useState<Plant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlants = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getPlants()
      setPlants(data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load plants. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlants()
  }, [fetchPlants])

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-text-muted">SolarPulse</p>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted">
            Your solar fleet at a glance
          </p>
        </header>

        {!isLoading && !error && <DashboardKPIRow plants={plants} />}

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-muted">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <p className="text-sm">Loading plants…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-[var(--radius-card)] border border-accent-red/30 bg-accent-red-bg px-5 py-4">
            <p role="alert" className="text-sm text-accent-red">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchPlants}
            >
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && plants.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] py-24 text-center">
            <Sun className="h-8 w-8 text-text-subtle" aria-hidden />
            <p className="text-sm font-medium text-text-primary">No plants yet</p>
            <p className="max-w-sm text-sm text-text-muted">
              Plants you register will appear here. Add one via the API to get started.
            </p>
          </div>
        )}

        {!isLoading && !error && plants.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => navigate(`/plants/${plant.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
