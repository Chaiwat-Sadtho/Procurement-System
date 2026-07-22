import { Skeleton } from '@/shared/components/ui/skeleton'

interface ListLoadingStateProps {
  testId?: string
  rows?: number
  /** announced to screen readers while loading */
  label?: string
}

/**
 * Loading placeholder for list pages: skeleton rows inside a polite, busy status region, so screen
 * readers announce the load instead of landing on decorative blocks.
 */
export function ListLoadingState({
  testId,
  rows = 5,
  label = 'กำลังโหลดข้อมูล',
}: ListLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid={testId}
      className="space-y-2"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" aria-hidden="true" />
      ))}
    </div>
  )
}
