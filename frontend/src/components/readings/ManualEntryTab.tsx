import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Save } from 'lucide-react'
import { getExpectedOutput, uploadReadingsJson } from '../../api/readings'
import type { ReadingsUploadResult } from '../../types'

const DAYLIGHT_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

interface Props {
  plantId: number
  onSuccess: (result: ReadingsUploadResult) => void
}

export function ManualEntryTab({ plantId, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [expected, setExpected] = useState<Record<number, number>>({})
  const [actuals, setActuals] = useState<Record<number, string>>({})
  const [overwrite, setOverwrite] = useState(false)
  const [loadingExpected, setLoadingExpected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch expected values whenever date changes
  useEffect(() => {
    if (!date) return
    setLoadingExpected(true)
    getExpectedOutput(plantId, date)
      .then(r => setExpected(r.expected_by_hour))
      .catch(() => setExpected({}))
      .finally(() => setLoadingExpected(false))
  }, [plantId, date])

  const handleSave = async () => {
    setError(null)
    const readings = DAYLIGHT_HOURS
      .filter(h => actuals[h] !== undefined && actuals[h] !== '')
      .map(h => ({
        hour: h,
        actual_output_kwh: parseFloat(actuals[h]),
        expected_output_kwh: expected[h] ?? undefined,
      }))

    if (readings.length === 0) {
      setError('Enter at least one hour of data before saving.')
      return
    }
    if (readings.some(r => isNaN(r.actual_output_kwh) || r.actual_output_kwh < 0)) {
      setError('All values must be non-negative numbers.')
      return
    }

    setSaving(true)
    try {
      const result = await uploadReadingsJson(plantId, { date, readings, overwrite })
      onSuccess(result)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to save readings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Date + overwrite */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">Date</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none mt-5">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={e => setOverwrite(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-text-muted">Replace existing data for this date</span>
        </label>
      </div>

      {/* Hour table */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-[var(--color-border)]">
              <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted w-20">Hour</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted">Expected (kWh)</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted">Your Reading (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {DAYLIGHT_HOURS.map((h, i) => (
              <motion.tr
                key={h}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-2.5 px-4 font-mono text-text-muted">{fmtHour(h)}</td>
                <td className="py-2.5 px-4 text-text-muted">
                  {loadingExpected
                    ? <span className="inline-block h-4 w-20 bg-slate-100 rounded animate-pulse" />
                    : expected[h] !== undefined
                      ? expected[h].toLocaleString(undefined, { maximumFractionDigits: 1 })
                      : '—'
                  }
                </td>
                <td className="py-2.5 px-4">
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="e.g. 4250.5"
                    value={actuals[h] ?? ''}
                    onChange={e => setActuals(prev => ({ ...prev, [h]: e.target.value }))}
                    className="w-full max-w-[180px] rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-200">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {saving ? 'Saving…' : 'Save Readings'}
      </button>
    </div>
  )
}
