import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PerformanceDateSelectorProps {
  value: string
  onChange: (date: string) => void
  disabled?: boolean
}

export default function PerformanceDateSelector({
  value,
  onChange,
  disabled = false,
}: PerformanceDateSelectorProps) {
  return (
    <div className="mb-6 max-w-xs">
      <Label htmlFor="performance-date" className="text-text-muted">
        Evaluation date
      </Label>
      <div className="relative mt-2">
        <Calendar
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <Input
          id="performance-date"
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 [color-scheme:dark]"
        />
      </div>
    </div>
  )
}
