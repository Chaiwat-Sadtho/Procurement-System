import { Skeleton } from '@/shared/components/ui/skeleton'

interface ListLoadingStateProps {
  /** preserves the per-page data-testid used by existing page tests */
  testId?: string
  rows?: number
  /** announced to screen readers while loading */
  label?: string
}

/**
 * Loading placeholder for list pages. Wraps the skeleton rows in a polite,
 * busy status region so screen readers announce that data is loading instead
 * of landing on a silent block of decorative skeletons.
 */
export function ListLoadingState({
  testId,
  rows = 5,
  label = 'กำลังโหลดข้อมูล',
}: ListLoadingStateProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-testid={testId} className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" aria-hidden="true" />
      ))}
    </div>
  )
}
