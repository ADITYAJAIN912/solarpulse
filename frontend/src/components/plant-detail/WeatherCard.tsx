import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cloud, CloudRain, Droplets, Sun, Thermometer, Wind,
  Zap, AlertTriangle, TrendingUp, Sunrise, Sunset,
} from 'lucide-react'
import { getWeather, type WeatherData } from '@/api/weather'
import type { Plant } from '@/types'

export type { WeatherData }

// ── Weather icon mapping ─────────────────────────────────────────────────────
function WeatherIcon({ icon, size = 24, className = '' }: { icon: string; size?: number; className?: string }) {
  const props = { size, className }
  switch (icon) {
    case 'sun':       return <Sun {...props} />
    case 'cloud-sun': return <Cloud {...props} />
    case 'cloud':     return <Cloud {...props} />
    case 'rain':      return <CloudRain {...props} />
    case 'storm':     return <Zap {...props} />
    default:          return <Cloud {...props} />
  }
}

// ── Solar impact badge ───────────────────────────────────────────────────────
const IMPACT_STYLES = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  good:      'bg-green-50  text-green-700   border-green-200',
  moderate:  'bg-amber-50  text-amber-700   border-amber-200',
  poor:      'bg-red-50    text-red-700     border-red-200',
}

const IMPACT_ICONS = {
  excellent: <TrendingUp size={12} />,
  good:      <TrendingUp size={12} />,
  moderate:  <AlertTriangle size={12} />,
  poor:      <AlertTriangle size={12} />,
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({
  icon, label, value, unit, accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-white border border-[var(--color-border)] p-4">
      <div className="flex items-center gap-1.5 text-text-muted">{icon}
        <span className="text-[10.5px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black tracking-tight" style={accent ? { color: accent } : {}}>
          {value}
        </span>
        {unit && <span className="text-sm font-semibold text-text-muted">{unit}</span>}
      </div>
    </div>
  )
}

// ── UV index bar ─────────────────────────────────────────────────────────────
function UVBar({ value }: { value: number }) {
  const pct = Math.min((value / 11) * 100, 100)
  const color =
    value <= 2 ? '#22c55e'
    : value <= 5 ? '#84cc16'
    : value <= 7 ? '#f59e0b'
    : value <= 10 ? '#ef4444'
    : '#7c3aed'
  const label =
    value <= 2 ? 'Low' : value <= 5 ? 'Moderate' : value <= 7 ? 'High' : value <= 10 ? 'Very High' : 'Extreme'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-text-muted">
        <span>UV Index {value}</span>
        <span className="font-semibold" style={{ color }}>{label}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

// ── Cloud cover bar ──────────────────────────────────────────────────────────
function CloudBar({ value }: { value: number }) {
  const color = value <= 20 ? '#22c55e' : value <= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-text-muted">
        <span>Cloud Cover</span>
        <span className="font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
    </div>
  )
}

// ── Sunrise / Sunset ─────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-36 rounded bg-slate-100" />
        <div className="h-8 w-8 rounded-full bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-full rounded bg-slate-100" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  plant: Plant
  /** Pre-fetched weather from parent — avoids a duplicate API call */
  weather?: WeatherData | null
}

export default function WeatherCard({ plant, weather: weatherProp }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(weatherProp ?? null)
  const [loading, setLoading] = useState(!weatherProp)
  const [error, setError]     = useState(false)

  useEffect(() => {
    // If parent already supplied weather data, skip the fetch
    if (weatherProp !== undefined) {
      setWeather(weatherProp)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    getWeather(plant.latitude, plant.longitude)
      .then(setWeather)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [plant.latitude, plant.longitude, weatherProp])

  if (loading) return <WeatherSkeleton />

  if (error || !weather) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white px-5 py-4 text-sm text-text-muted">
        Weather data unavailable for this location.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <WeatherIcon icon={weather.weatherIcon} size={20} className="text-amber-500" />
            <span className="text-xl font-black tracking-tight text-text-primary">
              {weather.temperature}°C
            </span>
            <span className="text-sm text-text-muted">/ Feels {weather.feelsLike}°C</span>
          </div>
          <p className="text-sm font-semibold text-text-muted">{weather.weatherLabel}</p>
          <p className="text-xs text-text-subtle mt-0.5">{plant.location}</p>
        </div>

        {/* Solar impact badge */}
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${IMPACT_STYLES[weather.solarImpact]}`}>
          {IMPACT_ICONS[weather.solarImpact]}
          {weather.solarImpact.charAt(0).toUpperCase() + weather.solarImpact.slice(1)} Solar
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<Thermometer size={13} />}
            label="Temperature"
            value={weather.temperature}
            unit="°C"
            accent="#f59e0b"
          />
          <StatTile
            icon={<Droplets size={13} />}
            label="Humidity"
            value={weather.humidity}
            unit="%"
            accent="#3b82f6"
          />
          <StatTile
            icon={<Wind size={13} />}
            label="Wind"
            value={weather.windSpeed}
            unit="km/h"
            accent="#6366f1"
          />
          <StatTile
            icon={<Sun size={13} />}
            label="UV Index"
            value={weather.uvIndex}
            accent={weather.uvIndex >= 8 ? '#ef4444' : weather.uvIndex >= 5 ? '#f59e0b' : '#22c55e'}
          />
        </div>

        {/* Progress bars */}
        <div className="space-y-3 rounded-xl bg-slate-50 border border-[var(--color-border)] px-4 py-4">
          <UVBar value={weather.uvIndex} />
          <CloudBar value={weather.cloudCover} />
        </div>

        {/* Sunrise / Sunset */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Sunrise size={16} className="text-amber-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Sunrise</p>
              <p className="font-semibold text-text-primary">{fmtTime(weather.sunrise)}</p>
            </div>
          </div>
          <div className="h-px flex-1 mx-4 bg-amber-200" />
          <div className="flex items-center gap-2 text-sm">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Sunset</p>
              <p className="font-semibold text-text-primary">{fmtTime(weather.sunset)}</p>
            </div>
            <Sunset size={16} className="text-orange-500" />
          </div>
        </div>

        {/* Solar impact note */}
        <p className="text-xs text-text-muted">
          <span className="font-semibold">Solar outlook: </span>
          {weather.solarImpactLabel}. Cloud cover at {weather.cloudCover}% with UV index {weather.uvIndex} today.
        </p>
      </div>
    </motion.div>
  )
}
