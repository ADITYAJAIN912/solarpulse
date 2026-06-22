import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Loader2, Download, X } from 'lucide-react'
import { downloadTemplate, uploadReadingsCsv } from '../../api/readings'
import type { ReadingsUploadResult } from '../../types'

interface Props {
  plantId: number
  onSuccess: (result: ReadingsUploadResult) => void
}

export function CsvUploadTab({ plantId, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [file, setFile] = useState<File | null>(null)
  const [overwrite, setOverwrite] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Please select a .csv file.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5 MB.')
      return
    }
    setError(null)
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadReadingsCsv(plantId, file, overwrite)
      onSuccess(result)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (detail && typeof detail === 'object' && 'errors' in detail) {
        const errs = (detail as { errors: string[] }).errors
        setError(`Validation errors in CSV:\n${errs.slice(0, 5).join('\n')}${errs.length > 5 ? `\n…and ${errs.length - 5} more` : ''}`)
      } else {
        setError(typeof detail === 'string' ? detail : 'Upload failed. Please check your file and try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      await downloadTemplate(plantId, today)
    } catch {
      setError('Could not download template.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="rounded-xl bg-slate-50 border border-[var(--color-border)] px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-text-primary">CSV format</p>
        <p className="text-xs font-mono bg-white rounded-lg border border-[var(--color-border)] px-3 py-2 text-text-muted">
          date,hour,actual_output_kwh,expected_output_kwh<br />
          2026-06-01,6,1200.5,1400.0<br />
          2026-06-01,7,3100.2,3200.0<br />
          <span className="opacity-50">…</span>
        </p>
        <p className="text-xs text-text-muted">
          <strong>expected_output_kwh</strong> is optional — leave it blank and the system will calculate it automatically from your plant's capacity.
        </p>
        <button
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          {downloadingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Download pre-filled template (today's expected values)
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? 'border-emerald-400 bg-emerald-50'
            : file
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-[var(--color-border)] hover:border-emerald-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
              <FileText size={32} className="mx-auto text-emerald-500" />
              <p className="font-semibold text-text-primary">{file.name}</p>
              <p className="text-sm text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={e => { e.stopPropagation(); setFile(null); setError(null) }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
              >
                <X size={12} /> Remove
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <Upload size={32} className="mx-auto text-text-muted" />
              <p className="font-semibold text-text-primary">Drop your CSV here</p>
              <p className="text-sm text-text-muted">or click to browse</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overwrite toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="rounded" />
        <span className="text-sm text-text-muted">Replace existing readings for dates in this file</span>
      </label>

      {error && (
        <pre className="text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-200 whitespace-pre-wrap">{error}</pre>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {uploading ? 'Uploading…' : 'Upload CSV'}
      </button>
    </div>
  )
}
