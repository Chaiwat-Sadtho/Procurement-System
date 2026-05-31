import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
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
import { PRListFilterForm, type PRListFilterValues } from '../components/PRListFilterForm'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import type { PRStatus } from '../types'

export function PRListPage() {
  const { data: user } = useCurrentUser()
  const { page, limit, setPage, nextPage, prevPage } = usePagination()
  const [filters, setFilters] = useState<PRListFilterValues | null>(null)

  const showRequester = user?.role === 'manager' || user?.role === 'procurement_officer'

  const queryParams = filters
    ? {
        page,
        limit,
        prNumber: filters.prNumber || undefined,
        search: filters.search || undefined,
        from: filters.from,
        to: filters.to,
        requesterName: filters.requesterName?.trim() || undefined,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
      }
    : undefined

  const { data, isLoading } = usePurchaseRequests(queryParams, { enabled: filters !== null })

  const canCreate = user?.role === 'employee'
  // running number sticks to the page actually returned by the server (meta),
  // not the local page state which momentarily leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  const handleSubmit = (values: PRListFilterValues) => {
    setPage(1)
    setFilters(values)
  }

  const handleClear = () => {
    setFilters(null)
    setPage(1)
  }

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

      <PRListFilterForm showRequester={showRequester} onSubmit={handleSubmit} onClear={handleClear} />

      {filters === null ? (
        <p className="text-center py-12 text-muted-foreground">
          กรุณาเลือกช่วงวันที่และกดค้นหาเพื่อดูข้อมูล
        </p>
      ) : isLoading ? (
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
                      ไม่พบข้อมูลตามเงื่อนไข
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((pr, i) => (
                    <TableRow key={pr.id}>
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
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
                <Button variant="outline" size="sm" onClick={prevPage} disabled={page <= 1}>
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
