import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { usePagination } from '@/shared/hooks/usePagination'
import { formatCurrency, formatDate, getRowIndex } from '@/shared/lib/utils'
import { PRStatusBadge } from '../components/PRStatusBadge'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import type { PRStatus } from '../types'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function PRListPage() {
  const { data: user } = useCurrentUser()
  const { page, limit, nextPage, prevPage } = usePagination()
  const [status, setStatus] = useState<string>('all')

  const { data, isLoading } = usePurchaseRequests({
    page,
    limit,
    status: status === 'all' ? undefined : status,
  })

  const canCreate = user?.role === 'employee'

  return (
    <div>
      <PageHeader
        title="Purchase Requests"
        description="Manage purchase requests"
        action={
          canCreate ? (
            <Button asChild>
              <Link to="/purchase-requests/new">New PR</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div data-testid="pr-list-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed min-w-[1000px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                  <TableHead className="w-[140px]">PR Number</TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="w-[140px]">Requester</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Amount</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีข้อมูล
                      {canCreate && (
                        <Button asChild variant="link" className="ml-1 p-0 h-auto">
                          <Link to="/purchase-requests/new">สร้างใหม่</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((pr, i) => (
                    <TableRow key={pr.id}>
                      <TableCell className="text-center">{getRowIndex(page, limit, i)}</TableCell>
                      <TableCell className="font-mono text-sm truncate">{pr.prNumber}</TableCell>
                      <TableCell className="font-medium truncate">{pr.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate">
                        {pr.requester.fullName}
                      </TableCell>
                      <TableCell>
                        <PRStatusBadge status={pr.status as PRStatus} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(pr.totalEstimatedAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(pr.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/purchase-requests/${pr.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={page >= data.meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
