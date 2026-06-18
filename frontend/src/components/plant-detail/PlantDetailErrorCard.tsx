import { Button } from '@/components/ui/button'

interface PlantDetailErrorCardProps {
  message: string
  onRetry?: () => void
}

export default function PlantDetailErrorCard({ message, onRetry }: PlantDetailErrorCardProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-accent-red/30 bg-accent-red-bg px-5 py-4">
      <p role="alert" className="text-sm text-accent-red">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
