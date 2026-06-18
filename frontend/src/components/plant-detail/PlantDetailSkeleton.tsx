import { Skeleton } from '@/components/ui/skeleton'

export function PlantDetailHeaderSkeleton() {
  return (
    <header className="mb-8">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-8 w-64 max-w-full" />
      <div className="mt-4 flex gap-6">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
    </header>
  )
}

export function PerformanceDateSelectorSkeleton() {
  return (
    <div className="mb-6 max-w-xs">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-2 h-9 w-full" />
    </div>
  )
}

export function PerformanceSummarySkeleton() {
  return (
    <section aria-label="Loading performance summary" className="mb-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-bg-surface px-5 py-4"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function PlantDetailPageSkeleton() {
  return (
    <>
      <PlantDetailHeaderSkeleton />
      <PerformanceDateSelectorSkeleton />
      <PerformanceSummarySkeleton />
    </>
  )
}
