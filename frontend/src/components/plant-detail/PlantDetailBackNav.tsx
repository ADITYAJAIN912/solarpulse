import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlantDetailBackNavProps {
  onBack: () => void
}

export default function PlantDetailBackNav({ onBack }: PlantDetailBackNavProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 mb-6 text-text-muted hover:text-text-primary"
      onClick={onBack}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      Back to Dashboard
    </Button>
  )
}
