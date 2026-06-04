import { Button } from '@/shared/components/ui/button'

interface ListErrorStateProps {
  message: string
  onRetry: () => void
}

/**
 * Error state for list pages. Uses an assertive alert region so a failed fetch
 * is announced immediately, with a retry action.
 */
export function ListErrorState({ message, onRetry }: ListErrorStateProps) {
  return (
    <div role="alert" className="text-center py-12 space-y-3">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        ลองใหม่
      </Button>
    </div>
  )
}
