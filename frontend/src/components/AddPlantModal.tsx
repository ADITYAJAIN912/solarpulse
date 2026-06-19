/**
 * AddPlantModal — slide-up modal for registering a new solar plant.
 *
 * Fields mirror PlantCreate on the backend:
 *   name, location, latitude, longitude, capacity_mw
 *
 * Design choices:
 *  - Portal rendered over a backdrop so it doesn't inherit parent stacking.
 *  - AnimatePresence handles mount/unmount animation cleanly.
 *  - Pressing Escape or clicking the backdrop closes without submitting.
 *  - On success the caller receives the new Plant so the dashboard can
 *    optimistically append it without a full refetch.
 */

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MapPin, X, Zap } from 'lucide-react'
import { createPlant } from '@/api/plants'
import { getApiErrorMessage } from '@/lib/errors'
import type { Plant } from '@/types'

const EASE = [0.22, 1, 0.36, 1] as const

/* ── Field types ─────────────────────────────────────────────────────── */
interface FormState {
  name: string
  location: string
  latitude: string
  longitude: string
  capacity_mw: string
}

interface FieldErrors {
  name: string
  location: string
  latitude: string
  longitude: string
  capacity_mw: string
}

const EMPTY_FORM: FormState = {
  name: '',
  location: '',
  latitude: '',
  longitude: '',
  capacity_mw: '',
}

const NO_ERRORS: FieldErrors = {
  name: '',
  location: '',
  latitude: '',
  longitude: '',
  capacity_mw: '',
}

/* ── Props ───────────────────────────────────────────────────────────── */
export interface AddPlantModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the newly created plant so the parent can update its list. */
  onSuccess: (plant: Plant) => void
}

/* ── Styled field wrapper ────────────────────────────────────────────── */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-text-muted"
        >
          {label}
        </label>
        {hint && <span className="text-[10.5px] text-text-subtle">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-white px-4 py-2.5 text-[13.5px] text-text-primary',
    'outline-none placeholder:text-text-subtle transition-all duration-150 shadow-sm',
    hasError
      ? 'border-red-300 ring-2 ring-red-100'
      : 'border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.22)] focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20',
  ].join(' ')
}

/* ══════════════════════════════════════════════════════════════════════
   Modal
══════════════════════════════════════════════════════════════════════ */
export default function AddPlantModal({ isOpen, onClose, onSuccess }: AddPlantModalProps) {
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM)
  const [errors,      setErrors]      = useState<FieldErrors>(NO_ERRORS)
  const [apiError,    setApiError]    = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  /* Reset form when modal opens */
  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM)
      setErrors(NO_ERRORS)
      setApiError(null)
      setTimeout(() => firstInputRef.current?.focus(), 80)
    }
  }, [isOpen])

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, isSubmitting, onClose])

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      setErrors(prev => ({ ...prev, [key]: '' }))
      setApiError(null)
    }
  }

  function validate(): boolean {
    const errs = { ...NO_ERRORS }
    const lat = parseFloat(form.latitude)
    const lng = parseFloat(form.longitude)
    const cap = parseFloat(form.capacity_mw)

    if (!form.name.trim())
      errs.name = 'Plant name is required'
    else if (form.name.trim().length > 255)
      errs.name = 'Name must be under 255 characters'

    if (!form.location.trim())
      errs.location = 'Location description is required'

    if (!form.latitude.trim())
      errs.latitude = 'Latitude is required'
    else if (Number.isNaN(lat) || lat < -90 || lat > 90)
      errs.latitude = 'Enter a valid latitude (−90 to 90)'

    if (!form.longitude.trim())
      errs.longitude = 'Longitude is required'
    else if (Number.isNaN(lng) || lng < -180 || lng > 180)
      errs.longitude = 'Enter a valid longitude (−180 to 180)'

    if (!form.capacity_mw.trim())
      errs.capacity_mw = 'Capacity is required'
    else if (Number.isNaN(cap) || cap <= 0)
      errs.capacity_mw = 'Enter a positive number (e.g. 50)'

    setErrors(errs)
    return Object.values(errs).every(v => !v)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setApiError(null)
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const plant = await createPlant({
        name:        form.name.trim(),
        location:    form.location.trim(),
        latitude:    parseFloat(form.latitude),
        longitude:   parseFloat(form.longitude),
        capacity_mw: parseFloat(form.capacity_mw),
      })
      onSuccess(plant)
      onClose()
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not register plant. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isSubmitting && onClose()}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal
            aria-label="Register new plant"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="rounded-t-2xl border border-[rgba(0,0,0,0.09)] bg-white shadow-2xl sm:rounded-2xl">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.07)] px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                    <Zap size={15} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted">
                      Fleet Management
                    </p>
                    <p className="text-[14px] font-bold text-text-primary">Register New Plant</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-[#F7F7F3] hover:text-text-primary disabled:opacity-40"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="space-y-4 px-6 py-5">

                  {/* Name */}
                  <Field id="plant-name" label="Plant Name" error={errors.name}>
                    <input
                      ref={firstInputRef}
                      id="plant-name"
                      type="text"
                      placeholder="e.g. Jaisalmer Solar Alpha"
                      value={form.name}
                      onChange={set('name')}
                      disabled={isSubmitting}
                      className={inputClass(!!errors.name)}
                    />
                  </Field>

                  {/* Location */}
                  <Field
                    id="plant-location"
                    label="Location"
                    hint="City or region"
                    error={errors.location}
                  >
                    <input
                      id="plant-location"
                      type="text"
                      placeholder="e.g. Jaisalmer, Rajasthan, India"
                      value={form.location}
                      onChange={set('location')}
                      disabled={isSubmitting}
                      className={inputClass(!!errors.location)}
                    />
                  </Field>

                  {/* Lat / Lng row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      id="plant-lat"
                      label="Latitude"
                      hint="−90 to 90"
                      error={errors.latitude}
                    >
                      <div className="relative">
                        <input
                          id="plant-lat"
                          type="number"
                          step="any"
                          placeholder="26.9124"
                          value={form.latitude}
                          onChange={set('latitude')}
                          disabled={isSubmitting}
                          className={inputClass(!!errors.latitude)}
                        />
                      </div>
                    </Field>
                    <Field
                      id="plant-lng"
                      label="Longitude"
                      hint="−180 to 180"
                      error={errors.longitude}
                    >
                      <input
                        id="plant-lng"
                        type="number"
                        step="any"
                        placeholder="70.9130"
                        value={form.longitude}
                        onChange={set('longitude')}
                        disabled={isSubmitting}
                        className={inputClass(!!errors.longitude)}
                      />
                    </Field>
                  </div>

                  {/* Coords helper */}
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F3] px-3 py-2">
                    <MapPin size={11} className="shrink-0 text-text-subtle" />
                    <p className="text-[10.5px] text-text-subtle">
                      Find coordinates on{' '}
                      <a
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-green-600 underline-offset-2 hover:underline"
                      >
                        Google Maps
                      </a>
                      {' '}— right-click any location and copy the lat/lng.
                    </p>
                  </div>

                  {/* Capacity */}
                  <Field
                    id="plant-capacity"
                    label="Installed Capacity (MW)"
                    hint="Nameplate DC capacity"
                    error={errors.capacity_mw}
                  >
                    <div className="relative">
                      <input
                        id="plant-capacity"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="50"
                        value={form.capacity_mw}
                        onChange={set('capacity_mw')}
                        disabled={isSubmitting}
                        className={inputClass(!!errors.capacity_mw) + ' pr-12'}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-subtle">
                        MW
                      </span>
                    </div>
                  </Field>

                  {/* API error */}
                  <AnimatePresence>
                    {apiError && (
                      <motion.div
                        role="alert"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                      >
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                        <p className="text-[12.5px] font-medium text-red-700">{apiError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[rgba(0,0,0,0.07)] px-6 py-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-xl border border-[rgba(0,0,0,0.10)] px-4 py-2.5 text-[13px] font-semibold text-text-muted transition-colors hover:bg-[#F7F7F3] disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative overflow-hidden rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803d 60%, #0f6630 100%)' }}
                  >
                    <div
                      className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]"
                      aria-hidden
                    />
                    <span className="relative flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Registering…
                        </>
                      ) : (
                        'Register Plant →'
                      )}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
