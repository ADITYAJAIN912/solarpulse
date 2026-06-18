import { useParams } from 'react-router-dom'

export default function PlantDetailPage() {
  const { plantId } = useParams<{ plantId: string }>()

  return (
    <div style={{ padding: '2rem' }}>
      <p
        style={{ color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        SolarPulse / Plant
      </p>
      <h1
        style={{ color: 'var(--color-text-primary)', fontSize: '24px', fontWeight: 600, margin: '8px 0 4px' }}
      >
        Plant {plantId}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
        Performance charts, anomaly timeline, and AI insights — implementation coming next.
      </p>
    </div>
  )
}
