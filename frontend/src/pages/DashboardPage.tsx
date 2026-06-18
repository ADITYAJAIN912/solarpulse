export default function DashboardPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <p
        style={{ color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        SolarPulse
      </p>
      <h1
        style={{ color: 'var(--color-text-primary)', fontSize: '24px', fontWeight: 600, margin: '8px 0 4px' }}
      >
        Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
        Plant cards and fleet overview — implementation coming next.
      </p>
    </div>
  )
}
