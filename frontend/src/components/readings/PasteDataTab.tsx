import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardPaste, Loader2, Save, RotateCcw } from 'lucide-react'
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

export function PasteDataTab({ plantId, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState<number[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [expected, setExpected] = useState<Record<number, number>>({})
  const [overwrite, setOverwrite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!date) return
    getExpectedOutput(plantId, date)
      .then(r => setExpected(r.expected_by_hour))
      .catch(() => setExpected({}))
  }, [plantId, date])

  // Parse pasted text every time it changes
  useEffect(() => {
    if (!pasteText.trim()) { setParsed([]); setParseError(null); return }

    // Split on newlines, tabs, commas, semicolons, or whitespace
    const tokens = pasteText.trim().split(/[\n\r\t,;]+/).map(t => t.trim()).filter(Boolean)
    const numbers = tokens.map(t => parseFloat(t))

    if (numbers.some(isNaN)) {
      setParseError(`Could not parse all values as numbers. Make sure you paste only numbers (one per line or tab-separated).`)
      setParsed([])
      return
    }
    if (numbers.some(n => n < 0)) {
      setParseError('All values must be non-negative.')
      setParsed([])
      return
    }
    if (numbers.length > 12) {
      setParseError(`Got ${numbers.length} values but expected at most 12 (one per daylight hour 06:00–17:00).`)
      setParsed([])
      return
    }

    setParseError(null)
    setParsed(numbers)
  }, [pasteText])

  const handleSave = async () => {
    setSubmitError(null)
    if (parsed.length === 0) { setSubmitError('No valid data to save.'); return }

    const readings = parsed.map((actual, idx) => ({
      hour: DAYLIGHT_HOURS[idx],
      actual_output_kwh: actual,
      expected_output_kwh: expected[DAYLIGHT_HOURS[idx]] ?? undefined,
    }))

    setSaving(true)
    try {
      const result = await uploadReadingsJson(plantId, { date, readings, overwrite })
      onSuccess(result)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSubmitError(typeof detail === 'string' ? detail : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-sm text-blue-800 font-medium mb-1">How to use</p>
        <p className="text-sm text-blue-700">
          Export hourly generation data from your inverter portal. Copy the column of 12 values
          (06:00 to 17:00) and paste them below. Values can be on separate lines or tab-separated.
        </p>
      </div>

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
          <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="rounded" />
          <span className="text-sm text-text-muted">Replace existing data for this date</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Paste area */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
            <ClipboardPaste size={12} className="inline mr-1" />
            Paste values here
          </label>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={"4250.5\n5100.2\n5600.0\n5800.1\n6000.0\n6100.3\n5900.2\n5500.0\n4800.1\n3500.5\n2100.0\n900.3"}
            rows={14}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 font-mono text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {parseError && (
            <p className="mt-2 text-xs text-red-600">{parseError}</p>
          )}
          {pasteText && !parseError && (
            <p className="mt-2 text-xs text-emerald-600">
              ✓ Parsed {parsed.length} value{parsed.length !== 1 ? 's' : ''} successfully
            </p>
          )}
        </div>

        {/* Preview table */}
        <AnimatePresence>
          {parsed.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Preview</label>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[var(--color-border)]">
                      <th className="py-2 px-3 text-left text-xs text-text-muted">Hour</th>
                      <th className="py-2 px-3 text-right text-xs text-text-muted">Expected</th>
                      <th className="py-2 px-3 text-right text-xs text-text-muted">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((val, idx) => {
                      const h = DAYLIGHT_HOURS[idx]
                      const exp = expected[h]
                      const pct = exp ? (val / exp) * 100 : null
                      return (
                        <tr key={h} className="border-b border-[var(--color-border)] last:border-0">
                          <td className="py-1.5 px-3 font-mono text-text-muted">{fmtHour(h)}</td>
                          <td className="py-1.5 px-3 text-right text-text-muted">{exp?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'}</td>
                          <td className={`py-1.5 px-3 text-right font-medium ${pct !== null && pct < 85 ? 'text-amber-600' : 'text-text-primary'}`}>
                            {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            {pct !== null && <span className="ml-1 text-xs opacity-60">({pct.toFixed(0)}%)</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-text-muted">Amber values indicate PR &lt; 85% — the AI analysis will flag these.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-200">{submitError}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || parsed.length === 0}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : `Save ${parsed.length} reading${parsed.length !== 1 ? 's' : ''}`}
        </button>
        {pasteText && (
          <button
            onClick={() => { setPasteText(''); setParsed([]); setParseError(null) }}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm text-text-muted hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}
      </div>
    </div>
  )
}
