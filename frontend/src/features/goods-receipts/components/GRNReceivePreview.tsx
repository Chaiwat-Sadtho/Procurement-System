import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

interface GRNReceivePreviewItem {
  remaining: number // ordered - alreadyReceived
  good: number // good qty this GRN (only good counts toward completion)
}

interface GRNReceivePreviewProps {
  items: GRNReceivePreviewItem[]
}

export function GRNReceivePreview({ items }: GRNReceivePreviewProps) {
  // §4A.2+4: a line will-complete when good >= remaining; whole GRN complete only
  // when EVERY line completes AND there is at least one line (empty != complete).
  const willComplete = items.length > 0 && items.every((it) => it.good >= it.remaining)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ผลการรับของ</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          data-testid="grn-receive-outcome"
          role="status"
          aria-live="polite"
          className={cn(
            'text-sm font-semibold',
            willComplete
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {willComplete ? 'รับครบถ้วน → PO completed' : 'รับไม่ครบ → partially_received'}
        </p>
      </CardContent>
    </Card>
  )
}
