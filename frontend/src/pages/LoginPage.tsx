export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <p
          style={{ color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          SolarPulse
        </p>
        <h1
          style={{ color: 'var(--color-text-primary)', fontSize: '22px', fontWeight: 600, margin: '8px 0 24px' }}
        >
          Sign in
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
          Login page — implementation coming next.
        </p>
      </div>
    </div>
  )
}
