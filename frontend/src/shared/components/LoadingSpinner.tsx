import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
  testId?: string
  /** announced to screen readers while loading */
  label?: string
  /** override the centering wrapper (e.g. min-h-screen for full-page loads) */
  className?: string
}

/**
 * Loading indicator for form and detail pages. The spinner sits in a polite, busy status region so
 * screen readers announce the load. List pages use ListLoadingState (skeleton rows) instead.
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
