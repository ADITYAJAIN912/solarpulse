/**
 * PerformanceDateSelector
 *
 * Two-way date entry:
 *  1. Type the date directly in "YYYY-MM-DD" format — calendar updates live
 *  2. Click the calendar icon to open the native date-picker popup
 *
 * The native <input type="date"> is kept visible but small to avoid
 * color-scheme issues; [color-scheme:light] ensures the browser popup
 * renders in the current light theme.
 */

import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PerformanceDateSelectorProps {
  value: string              // YYYY-MM-DD
  onChange: (date: string) => void
  disabled?: boolean
}

const ISO_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

function formatReadable(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  }).format(d)
}

export default function PerformanceDateSelector({
  value,
  onChange,
  disabled = false,
}: PerformanceDateSelectorProps) {
  /* text the user is currently typing */
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  /* keep draft in sync when the value changes externally (e.g. URL param) */
  useEffect(() => {
    if (!focused) setDraft(value)
  }, [value, focused])

  function commitDraft(raw: string) {
    const trimmed = raw.trim()
    if (trimmed === '') return

    if (ISO_RE.test(trimmed)) {
      const d = new Date(`${trimmed}T00:00:00`)
      if (!isNaN(d.getTime())) {
        setError('')
        onChange(trimmed)
        return
      }
    }
    setError('Use YYYY-MM-DD  ·  e.g. 2026-06-18')
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDraft(raw)
    setError('')

    /* auto-commit when the user has typed exactly 10 chars (full ISO) */
    if (raw.length === 10 && ISO_RE.test(raw)) {
      commitDraft(raw)
    }
  }

  function handleCalendarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (!v) return
    setDraft(v)
    setError('')
    onChange(v)
  }

  function openCalendar() {
    try {
      dateRef.current?.showPicker?.()
    } catch {
      dateRef.current?.click()
    }
  }

  return (
    <div className="mb-6 max-w-sm">
      <label
        htmlFor="perf-date-text"
        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
      >
        Evaluation date
      </label>

      {/* ── unified input row ─────────────────────────────────────────── */}
      <div
        className={cn(
          'relative mt-2 flex items-stretch overflow-hidden rounded-xl border bg-white',
          'shadow-sm transition-all duration-150',
          focused
            ? 'border-[#16A34A] ring-2 ring-[#16A34A]/20'
            : 'border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.22)]',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {/* Text input — shows ISO when focused, readable when blurred */}
        <input
          id="perf-date-text"
          type="text"
          className="flex-1 bg-transparent px-4 py-2.5 text-[13.5px] font-medium text-text-primary outline-none placeholder:text-text-subtle"
          placeholder="YYYY-MM-DD"
          value={focused ? draft : formatReadable(draft) || draft}
          onChange={handleTextChange}
          onFocus={() => {
            setFocused(true)
            setDraft(value)   /* switch to raw YYYY-MM-DD for editing */
          }}
          onBlur={() => {
            setFocused(false)
            commitDraft(draft)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          disabled={disabled}
          maxLength={10}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Divider */}
        <div className="my-2 w-px bg-[rgba(0,0,0,0.07)]" />

        {/* Calendar icon button */}
        <button
          type="button"
          onClick={openCalendar}
          className={cn(
            'flex w-11 items-center justify-center transition-colors',
            'text-text-muted hover:bg-[#F0FDF4] hover:text-[#16A34A]',
          )}
          tabIndex={-1}
          aria-label="Open calendar"
          disabled={disabled}
        >
          <CalendarDays size={16} />
        </button>

        {/*
          Native date input — visually hidden but functionally intact.
          color-scheme:light ensures the browser calendar popup uses the
          light-mode palette (readable on our white background).
        */}
        <input
          ref={dateRef}
          type="date"
          value={value}
          onChange={handleCalendarChange}
          tabIndex={-1}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:light]"
          style={{ pointerEvents: 'none' }}
          disabled={disabled}
          aria-hidden
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-[11.5px] font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Hint — only shown when focused on text input */}
      {focused && !error && (
        <p className="mt-1.5 text-[11px] text-text-subtle">
          Type a date or click <CalendarDays size={10} className="inline" /> to pick
        </p>
      )}
    </div>
  )
}
