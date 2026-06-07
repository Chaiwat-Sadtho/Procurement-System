import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { PageHeader } from '@/shared/components/PageHeader'
import { ListLoadingState } from '@/shared/components/ListLoadingState'
import { ListEmptyRow } from '@/shared/components/ListEmptyRow'
import { ListSearchPrompt } from '@/shared/components/ListSearchPrompt'
import { ListPaginationFooter } from '@/shared/components/ListPaginationFooter'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { usePagination, useClampPageToTotal } from '@/shared/hooks/usePagination'
import { formatCurrency, formatDate, getRowIndex } from '@/shared/lib/utils'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { PRStatusBadge } from '../components/PRStatusBadge'
import { PRListFilterForm, type PRListFilterValues } from '../components/PRListFilterForm'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import { usePRMutations } from '../hooks/usePRMutations'
import type { PRStatus, PurchaseRequest } from '../types'

export function PRListPage() {
  const { data: user } = useCurrentUser()
  const { page, limit, nextPage, prevPage, setLimit, setParams } = usePagination()
  const [searchParams] = useSearchParams()
  const urlStatus = searchParams.get('status') ?? undefined
  const [filters, setFilters] = useState<PRListFilterValues | null>(
    urlStatus
      ? { prNumber: '', search: '', from: '', to: '', requesterName: '', status: urlStatus }
      : null,
  )
  const { deleteMutation } = usePRMutations()
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(null)

  const canManageRow = (pr: PurchaseRequest) =>
    user?.role === 'employee' && user.id === pr.requesterId && pr.status === 'draft'

  const showRequester = user?.role === 'manager' || user?.role === 'procurement_officer'

  const queryParams = filters
    ? {
        page,
        limit,
        prNumber: filters.prNumber || undefined,
        search: filters.search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        requesterName: filters.requesterName?.trim() || undefined,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
      }
    : undefined

  const { data, isLoading } = usePurchaseRequests(queryParams, { enabled: filters !== null })
  useClampPageToTotal(data?.meta.totalPages)

  const canCreate = user?.role === 'employee'
  // running number sticks to the page actually returned by the server (meta),
  // not the local page state which momentarily leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  // Keep the URL ?status= in sync with the committed filter so a reload/deep-link
  // restores what the user is viewing, not the stale value they arrived with.
  // Driven by an effect (not the submit handler): RHF's handleSubmit runs its
  // callback in an async microtask outside React's batching, where react-router's
  // navigate is a no-op — only setState survives there. The effect runs post-commit
  // in React's normal flow, so the write lands. It is idempotent (writes only when
  // the desired status differs from the URL), which both prevents a render loop and
  // is StrictMode-safe: the double-invoked mount effect is a no-op when the URL
  // already matches, so a deep-linked page is preserved. Page resets to 1 on a real
  // status change since the result set changes; merge-safe write keeps limit.
  const desiredStatus =
    filters && filters.status && filters.status !== 'all' ? filters.status : undefined
  useEffect(() => {
    if (desiredStatus === urlStatus) return
    setParams((params) => {
      params.set('page', '1')
      if (desiredStatus) params.set('status', desiredStatus)
      else params.delete('status')
    })
    // setParams is stable enough; re-run when the committed status or URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredStatus, urlStatus])

  const handleSubmit = (values: PRListFilterValues) => {
    setFilters(values)
  }

  const handleClear = () => {
    setFilters(null)
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

      <PRListFilterForm
        showRequester={showRequester}
        initialStatus={urlStatus}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />

      {filters === null ? (
        <ListSearchPrompt message="กรุณาเลือกช่วงวันที่และกดค้นหาเพื่อดูข้อมูล" />
      ) : isLoading ? (
        <ListLoadingState testId="pr-list-loading" />
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
                  <ListEmptyRow colSpan={8} />
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
                        {canManageRow(pr) && (
                          <>
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/purchase-requests/${pr.id}/edit`}>แก้ไข</Link>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(pr)}>
                              ลบ
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.meta.total > 0 && (
            <ListPaginationFooter
              summary={`Page ${data.meta.page} of ${data.meta.totalPages} (${data.meta.total} total)`}
              page={page}
              totalPages={data.meta.totalPages}
              limit={limit}
              onPrev={prevPage}
              onNext={nextPage}
              onLimitChange={setLimit}
              prevLabel="Previous"
              nextLabel="Next"
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบใบร่างคำขอซื้อ"
        description={`ต้องการลบ ${deleteTarget?.prNumber ?? ''} หรือไม่ (ย้อนกลับไม่ได้)`}
        confirmLabel="ยืนยันลบ"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('ลบใบร่างแล้ว')
              setDeleteTarget(null)
            },
            onError: (e) => toast.error(getApiErrorMessage(e)),
          })
        }}
      />
    </div>
  )
}
