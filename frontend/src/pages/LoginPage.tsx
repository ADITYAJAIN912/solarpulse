/**
 * LoginPage — premium split-screen layout.
 *
 * Left panel  : dark deep-green gradient, brand copy, animated solar
 *               illustration, feature bullets, desert stats strip.
 * Right panel : crisp white form card with animated entry, labelled
 *               inputs, password visibility toggle, green CTA button.
 */

import { type FormEvent, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  MapPin,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { TOKEN_KEY } from '@/api/client'
import SolarIllustration from '@/components/SolarIllustration'
import { getApiErrorMessage } from '@/lib/errors'

/* ── Stagger helpers ───────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as const

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* ── Feature bullet ────────────────────────────────────────────────── */
interface FeatureProps {
  icon: React.ReactNode
  title: string
  desc: string
  delay: number
}

function Feature({ icon, title, desc, delay }: FeatureProps) {
  return (
    <FadeUp delay={delay} className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-green-300">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[11.5px] leading-snug text-green-200/70">{desc}</p>
      </div>
    </FadeUp>
  )
}

/* ── Stat pill ─────────────────────────────────────────────────────── */
function StatPill({
  value,
  label,
  delay,
}: {
  value: string
  label: string
  delay: number
}) {
  return (
    <FadeUp delay={delay} className="flex flex-col items-center gap-0.5">
      <span className="nums text-[1.6rem] font-black leading-none text-white">
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-green-300/80">
        {label}
      </span>
    </FadeUp>
  )
}

/* ── Animated char heading ─────────────────────────────────────────── */
function SplitHeading({ lines }: { lines: { text: string; delay: number }[] }) {
  return (
    <h1 className="text-[clamp(2rem,3.5vw,2.8rem)] font-black leading-[1.05] tracking-tight text-white">
      {lines.map(({ text, delay }, li) => (
        <span key={li} className="block overflow-hidden">
          {text.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + i * 0.022, duration: 0.42, ease: EASE }}
              aria-hidden
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
        </span>
      ))}
    </h1>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors,  setFieldErrors]  = useState({ email: '', password: '' })

  if (localStorage.getItem(TOKEN_KEY)) {
    return <Navigate to="/dashboard" replace />
  }

  function validate() {
    const errs = { email: '', password: '' }
    if (!email.trim())   errs.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email'
    if (!password)       errs.password = 'Password is required'
    setFieldErrors(errs)
    return !errs.email && !errs.password
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const { access_token } = await login({ email: email.trim(), password })
      localStorage.setItem(TOKEN_KEY, access_token)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid email or password. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ══ LEFT PANEL ═══════════════════════════════════════════════ */}
      <div
        className="relative hidden flex-col overflow-hidden lg:flex lg:w-[58%]"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 20% 80%, rgba(22,163,74,0.25) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 20%, rgba(14,165,233,0.12) 0%, transparent 55%),
            linear-gradient(150deg, #052e16 0%, #14532d 45%, #0c2340 100%)
          `,
        }}
      >
        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden
        />

        {/* Shimmer top border */}
        <div className="absolute inset-x-0 top-0 h-[2px] shimmer-border" aria-hidden />

        {/* Content */}
        <div className="relative flex flex-1 flex-col justify-between px-12 py-12">

          {/* Brand mark */}
          <FadeUp delay={0.1}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 ring-1 ring-green-400/30">
                <Zap className="h-4 w-4 text-green-300" />
              </div>
              <span className="text-[15px] font-bold tracking-tight text-white">SolarPulse</span>
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-green-300 ring-1 ring-green-400/30">
                v2
              </span>
            </div>
          </FadeUp>

          {/* Centre block */}
          <div className="space-y-8">
            {/* Headline */}
            <FadeUp delay={0.25}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-green-400/80">
                Solar Fleet Intelligence
              </p>
            </FadeUp>

            <SplitHeading
              lines={[
                { text: 'Welcome to',   delay: 0.3  },
                { text: 'SolarPulse.',  delay: 0.45 },
              ]}
            />

            <FadeUp delay={0.6}>
              <p className="max-w-xs text-[14px] leading-relaxed text-green-100/75">
                AI-powered monitoring platform for utility-scale solar farms
                across the Thar Desert, Rajasthan.
              </p>
            </FadeUp>

            {/* Solar illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              transition={{ delay: 0.55, duration: 0.65, ease: EASE }}
              className="-ml-4 flex justify-center"
            >
              <SolarIllustration />
            </motion.div>

            {/* Feature bullets */}
            <div className="space-y-3.5">
              <Feature
                icon={<Sparkles size={14} />}
                title="AI Root-Cause Analysis"
                desc="LLM-powered fault detection with actionable recommendations"
                delay={0.75}
              />
              <Feature
                icon={<Activity size={14} />}
                title="Real-Time Performance"
                desc="Hourly PR tracking, risk scoring, and anomaly detection"
                delay={0.85}
              />
              <Feature
                icon={<Leaf size={14} />}
                title="Sustainability Metrics"
                desc="CO₂ avoided, kWh generated, and carbon equivalence reports"
                delay={0.95}
              />
              <Feature
                icon={<MapPin size={14} />}
                title="Jaisalmer Desert Network"
                desc="GPS-mapped fleet with satellite-view location tracking"
                delay={1.05}
              />
            </div>
          </div>

          {/* Stats strip */}
          <FadeUp delay={1.1}>
            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-around gap-4">
                <StatPill value="2"      label="Plants"    delay={1.15} />
                <div className="h-10 w-px bg-white/10" />
                <StatPill value="100"    label="MW Total"  delay={1.2}  />
                <div className="h-10 w-px bg-white/10" />
                <StatPill value="6.2"    label="kWh/m²/d"  delay={1.25} />
                <div className="h-10 w-px bg-white/10" />
                <StatPill value="24/7"   label="Monitored" delay={1.3}  />
              </div>
              <p className="mt-3 text-center text-[10.5px] text-green-300/60">
                📍 Jaisalmer, Rajasthan · Thar Desert · India
              </p>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════════ */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-[42%]">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.55, ease: EASE }}
        >
          {/* Mobile brand (hidden on desktop) */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#16A34A]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold text-text-primary">SolarPulse</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-text-muted">
              Fleet Access
            </p>
            <h2 className="mt-1.5 text-[1.75rem] font-black leading-tight tracking-tight text-text-primary">
              Sign in to your
              <br />
              <span className="gradient-text">account.</span>
            </h2>
            <p className="mt-2 text-[13px] text-text-muted">
              Enter your credentials to access the solar fleet dashboard.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-text-muted"
              >
                Email address
              </label>
              <div
                className={`flex items-center overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-150
                  ${fieldErrors.email
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.22)] focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-[#16A34A]/20'
                  }`}
              >
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })) }}
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent px-4 py-3 text-[13.5px] text-text-primary outline-none placeholder:text-text-subtle disabled:opacity-50"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] font-medium text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-text-muted"
              >
                Password
              </label>
              <div
                className={`flex items-center overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-150
                  ${fieldErrors.password
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.22)] focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-[#16A34A]/20'
                  }`}
              >
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })) }}
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent px-4 py-3 text-[13.5px] text-text-primary outline-none placeholder:text-text-subtle disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="px-3 text-text-muted transition-colors hover:text-text-primary"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] font-medium text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {/* API error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                  <p className="text-[12.5px] font-medium text-red-700">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-xl py-3.5 text-[14px] font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #16A34A 0%, #15803d 60%, #0f6630 100%)',
              }}
            >
              {/* Hover shimmer */}
              <div
                className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]"
                aria-hidden
              />
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to SolarPulse
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    >
                      →
                    </motion.span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Trust strip */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[rgba(0,0,0,0.07)]" />
              <span className="text-[10.5px] font-medium text-text-subtle">Secured access</span>
              <div className="h-px flex-1 bg-[rgba(0,0,0,0.07)]" />
            </div>

            <div className="flex items-center justify-center gap-5 text-[10.5px] text-text-subtle">
              {['JWT Auth', 'HTTPS Only', 'FastAPI Backend'].map(label => (
                <span key={label} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-[11px] text-text-subtle">
            SolarPulse v2 · Jaisalmer, Rajasthan · Thar Desert Solar Network
          </p>
        </motion.div>
      </div>
    </div>
  )
}
