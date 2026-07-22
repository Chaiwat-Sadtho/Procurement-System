import { Button } from '@/shared/components/ui/button'

interface ListErrorStateProps {
  message: string
  onRetry: () => void
}

/** Error state for list pages: an assertive alert region, so a failed fetch is announced at once. */
export function ListErrorState({ message, onRetry }: ListErrorStateProps) {
  return (
    <div role="alert" aria-live="assertive" className="text-center py-12 space-y-3">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" className="w-full sm:w-auto" onClick={onRetry}>
        ลองใหม่
      </Button>
    </div>
  )
}
