import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import { useAttentionPRs } from '../hooks/useAttentionPRs'

function Section({ title, status, prs }: { title: string; status: string; prs: PurchaseRequest[] }) {
  if (prs.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">
          {title} ({prs.length})
        </p>
        <Link
          to={`/purchase-requests?status=${status}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </div>
      {prs.map((pr) => (
        <Link
          key={pr.id}
          to={`/purchase-requests/${pr.id}`}
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <span className="font-mono text-xs text-muted-foreground">{pr.prNumber}</span>
            <span className="truncate">{pr.title}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">ดู →</span>
        </Link>
      ))}
    </div>
  )
}

export function AttentionList() {
  const { data } = useAttentionPRs()
  const drafts = data?.drafts ?? []
  const rejected = data?.rejected ?? []

  if (drafts.length === 0 && rejected.length === 0) return null

  return (
    <Card data-testid="attention-list" className="border-l-4 border-l-amber-500">
      <CardContent className="py-4 space-y-4">
        <p className="text-sm font-semibold">ต้องจัดการ</p>
        <Section title="Draft รอส่ง" status="draft" prs={drafts} />
        <Section title="Rejected รอแก้" status="rejected" prs={rejected} />
      </CardContent>
    </Card>
  )
}
