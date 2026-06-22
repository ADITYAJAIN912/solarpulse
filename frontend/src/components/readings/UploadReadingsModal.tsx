import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Keyboard, ClipboardPaste, FileUp, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { ManualEntryTab } from './ManualEntryTab'
import { PasteDataTab } from './PasteDataTab'
import { CsvUploadTab } from './CsvUploadTab'
import type { ReadingsUploadResult } from '../../types'

type Tab = 'manual' | 'paste' | 'csv'

const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'manual',
    label: 'Manual Entry',
    icon: <Keyboard size={15} />,
    desc: 'Type hour-by-hour values directly',
  },
  {
    id: 'paste',
    label: 'Paste from Spreadsheet',
    icon: <ClipboardPaste size={15} />,
    desc: 'Copy a column from Excel / inverter export',
  },
  {
    id: 'csv',
    label: 'Upload CSV',
    icon: <FileUp size={15} />,
    desc: 'Upload a formatted .csv file',
  },
]

interface Props {
  plantId: number
  plantName: string
  open: boolean
  onClose: () => void
  onUploaded?: () => void
}

export function UploadReadingsModal({ plantId, plantName, open, onClose, onUploaded }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('manual')
  const [result, setResult] = useState<ReadingsUploadResult | null>(null)

  const handleSuccess = (r: ReadingsUploadResult) => {
    setResult(r)
    onUploaded?.()
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            <div
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Upload Readings</h2>
                  <p className="text-sm text-text-muted mt-0.5">{plantName}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-xl p-2 hover:bg-slate-100 transition-colors text-text-muted"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Success state */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-6 mt-5 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span className="font-semibold text-emerald-800">Data saved successfully</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-emerald-700 uppercase tracking-widest font-semibold">Inserted</p>
                        <p className="text-xl font-bold text-emerald-700">{result.rows_inserted}</p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-700 uppercase tracking-widest font-semibold">Skipped</p>
                        <p className="text-xl font-bold text-emerald-700">{result.rows_skipped}</p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-700 uppercase tracking-widest font-semibold">Dates</p>
                        <p className="text-xl font-bold text-emerald-700">{result.dates_covered.length}</p>
                      </div>
                    </div>
                    {result.dates_covered.length > 0 && (
                      <p className="text-xs text-emerald-700 mt-2">
                        Covered: {result.dates_covered.slice(0, 3).join(', ')}{result.dates_covered.length > 3 ? ` …+${result.dates_covered.length - 3} more` : ''}
                      </p>
                    )}
                    <p className="text-xs text-emerald-700/70 mt-2">
                      Go to the Plant Detail page and select one of these dates to see your data and AI analysis.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setResult(null)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Upload more data
                      </button>
                      <span className="text-emerald-300">·</span>
                      <button
                        onClick={handleClose}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab navigation */}
              <div className="flex gap-1 px-6 pt-5">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setResult(null) }}
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'text-text-muted hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
              <p className="px-6 pt-1.5 pb-0 text-xs text-text-muted">
                {TABS.find(t => t.id === activeTab)?.desc}
              </p>

              {/* Tab content */}
              <div className="px-6 py-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTab === 'manual' && (
                      <ManualEntryTab plantId={plantId} onSuccess={handleSuccess} />
                    )}
                    {activeTab === 'paste' && (
                      <PasteDataTab plantId={plantId} onSuccess={handleSuccess} />
                    )}
                    {activeTab === 'csv' && (
                      <CsvUploadTab plantId={plantId} onSuccess={handleSuccess} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
