import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

interface AttentionListProps {
  stats: PrStatsResponse | undefined
}

export function AttentionList({ stats }: AttentionListProps) {
  if (!stats) return null
  const rows = [
    { count: stats.draft, label: 'Draft รอส่ง', status: 'draft' },
    { count: stats.rejected, label: 'Rejected รอแก้', status: 'rejected' },
  ].filter((r) => r.count > 0)

  if (rows.length === 0) return null

  return (
    <Card data-testid="attention-list" className="border-l-4 border-l-amber-500">
      <CardContent className="py-4 space-y-2">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">ต้องจัดการ</p>
        {rows.map((r) => (
          <Link
            key={r.status}
            to={`/purchase-requests?status=${r.status}`}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <span>{r.label} ({r.count})</span>
            <span className="text-muted-foreground">ดู →</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
