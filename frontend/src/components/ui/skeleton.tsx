import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-badge)] bg-[#E2E2DC]',
        className,
      )}
      aria-hidden
    />
  )
}
