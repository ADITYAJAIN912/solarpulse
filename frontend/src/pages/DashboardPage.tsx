/**
 * DashboardPage — production-grade fleet monitoring layout.
 *
 * Layout: sticky topbar → compact page-header → metric row →
 *         alert banner → plant grid → location card.
 *
 * No marketing-style hero. Typography is dashboard-scale, not landing-page scale.
 * Animations are restrained (fade-up on load, hover on cards).
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Plus, RefreshCw, Sun, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TOKEN_KEY } from '@/api/client'
import { getPlants } from '@/api/plants'
import AddPlantModal from '@/components/AddPlantModal'
import AlertBanner from '@/components/AlertBanner'
import DashboardKPIRow from '@/components/DashboardKPIRow'
import LocationCard from '@/components/LocationCard'
import PlantCard from '@/components/PlantCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/errors'
import { fadeInUpVariants, pageEntrance, staggerContainerVariants } from '@/lib/motion'
import type { Plant } from '@/types'

/* ── Section divider with label ────────────────────────────────────── */
function SectionHeader({
  title,
  count,
  delay = 0,
}: {
  title: string
  count?: number
  delay?: number
}) {
  return (
    <motion.div
      className="mb-5 flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-text-muted">
        {title}
      </span>
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded-full bg-text-primary px-1.5 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
      <div className="h-px flex-1 bg-[rgba(0,0,0,0.07)]" />
    </motion.div>
  )
}

/* ── Live status badge ──────────────────────────────────────────────── */
function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
      </span>
      Live
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate()
  const [plants, setPlants] = useState<Plant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchPlants = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getPlants()
      setPlants(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load plants. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlants() }, [fetchPlants])

  const totalCapacityMw = plants.reduce((s, p) => s + p.capacity_mw, 0)

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    navigate('/login', { replace: true })
  }

  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(lastUpdated)

  return (
    <div className="min-h-screen bg-[#F7F7F3]">

      <AddPlantModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newPlant) => setPlants(prev => [...prev, newPlant])}
      />

      {/* ── Sticky topbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[rgba(0,0,0,0.07)] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-14">

          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#16A34A]">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14px] font-bold tracking-tight text-text-primary">SolarPulse</span>
            <span className="hidden sm:block h-4 w-px bg-[rgba(0,0,0,0.12)]" />
            <span className="hidden sm:block text-[12px] text-text-muted">Fleet Operations</span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="hidden md:block text-[11px] text-text-subtle">
              Updated {timeLabel}
            </span>
            <button
              onClick={fetchPlants}
              className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-1.5 text-text-muted transition-colors hover:bg-[#F0FDF4] hover:text-green-700"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[11.5px] font-semibold text-green-700 transition-colors hover:bg-green-100"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Add Plant</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page ───────────────────────────────────────────────────── */}
      <motion.main
        className="mx-auto max-w-6xl px-6 py-8 pb-24"
        initial={pageEntrance.initial}
        animate={pageEntrance.animate}
        transition={pageEntrance.transition}
      >

        {/* ── Compact page header ──────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.6rem] font-bold tracking-tight text-text-primary">
              Solar Fleet Overview
            </h1>
            {isLoading ? (
              <Skeleton className="mt-1.5 h-4 w-64" />
            ) : (
              <p className="mt-1 text-[13px] text-text-muted">
                {plants.length} {plants.length === 1 ? 'plant' : 'plants'} registered
                {plants.length > 0 && ` · ${totalCapacityMw.toFixed(1)} MW installed`}
                {' · '}Jaisalmer, Rajasthan
              </p>
            )}
          </div>

          {/* Date chip */}
          <time className="shrink-0 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[11.5px] font-medium text-text-muted shadow-sm">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            }).format(new Date())}
          </time>
        </div>

        {/* ── Loading ──────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0,1,2,3].map(i => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0,1].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {!isLoading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p role="alert" className="text-[13px] font-medium text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5 border-red-200 text-red-700 hover:bg-red-100"
              onClick={fetchPlants}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────── */}
        {!isLoading && !error && (
          <>
            {/* Metrics */}
            <DashboardKPIRow plants={plants} />

            {/* Alerts */}
            {plants.length > 0 && (
              <AlertBanner className="mb-8" plants={plants} />
            )}

            {/* Empty state */}
            {plants.length === 0 && (
              <motion.div
                className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[rgba(0,0,0,0.10)] bg-white py-24 text-center"
                variants={fadeInUpVariants}
                initial="initial"
                animate="animate"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] ring-1 ring-green-100">
                  <Sun className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">No plants registered</p>
                  <p className="mt-0.5 text-[13px] text-text-muted">
                    Plants you register will appear here.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Plants */}
            {plants.length > 0 && (
              <div className="mb-10">
                <SectionHeader title="Registered Plants" count={plants.length} delay={0.25} />
                <motion.div
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                  variants={staggerContainerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {plants.map((plant, i) => (
                    <motion.div key={plant.id} variants={fadeInUpVariants}>
                      <PlantCard
                        plant={plant}
                        index={i}
                        totalCapacityMw={totalCapacityMw}
                        onClick={() => navigate(`/plants/${plant.id}`)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Geography */}
            {plants.length > 0 && (
              <div>
                <SectionHeader title="Fleet Geography" delay={0.35} />
                <LocationCard />
              </div>
            )}
          </>
        )}
      </motion.main>
    </div>
  )
}
