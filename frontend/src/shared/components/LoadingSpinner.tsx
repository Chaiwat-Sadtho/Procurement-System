import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
  /** preserves a per-page data-testid used by existing page tests */
  testId?: string
  /** announced to screen readers while loading */
  label?: string
  /** override the centering wrapper (e.g. min-h-screen for full-page loads) */
  className?: string
}

/**
 * Block-level loading indicator for form/detail pages. Wraps the decorative
 * spinner in a polite, busy status region so screen readers announce that the
 * page is loading instead of landing on a silent spinning div. Differs from
 * ListLoadingState (skeleton rows) which is shaped for table/list pages.
 */
export function LoadingSpinner({ testId, label = 'กำลังโหลด', className }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid={testId}
      className={cn('flex items-center justify-center py-16', className)}
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
      />
    </div>
  )
}
