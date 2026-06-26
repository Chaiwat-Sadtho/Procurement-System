import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrency } from '@/shared/lib/utils'
import { useApprovalQueue } from '../hooks/useApprovalQueue'

export function ApprovalQueue() {
  const { data, isLoading } = useApprovalQueue()

  return (
    <Card data-testid="approval-queue" className="border-l-4 border-l-primary">
      <CardHeader className="pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">
          รออนุมัติของฉัน{data ? ` (${data.length})` : ''}
        </CardTitle>
        {data && data.length >= 5 && (
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to="/purchase-requests?status=submitted&q=1">ดูทั้งหมด</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div data-testid="approval-queue-loading" className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">ไม่มีรายการรออนุมัติ</p>
        ) : (
          data.map((pr) => (
            <div
              key={pr.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{pr.title}</p>
                <p className="text-xs text-muted-foreground">
                  <span>{pr.prNumber}</span>
                  {' · '}
                  <span>{pr.requester.fullName}</span>
                  {' · '}
                  <span>{formatCurrency(pr.totalEstimatedAmount)}</span>
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link to={`/purchase-requests/${pr.id}`}>ดู / อนุมัติ</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
