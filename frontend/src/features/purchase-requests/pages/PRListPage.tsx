import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { RowLink } from '@/shared/components/RowLink'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { usePagination, useClampPageToTotal } from '@/shared/hooks/usePagination'
import { useUrlFilters } from '@/shared/hooks/useUrlFilters'
import { formatCurrency, formatDate, getRowIndex } from '@/shared/lib/utils'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { PRStatusBadge } from '../components/PRStatusBadge'
import { PRListFilterForm, type PRListFilterValues } from '../components/PRListFilterForm'
import { prUrlFilterConfig } from '../lib/prUrlFilters'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import { usePRMutations } from '../hooks/usePRMutations'
import type { PRStatus, PurchaseRequest } from '../types'

export function PRListPage() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const { page, limit, nextPage, prevPage, setLimit } = usePagination()
  const { filters, hasSearched, signature, commit, clear } = useUrlFilters(prUrlFilterConfig)
  const { deleteMutation } = usePRMutations()
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(null)

  const canManageRow = (pr: PurchaseRequest) =>
    user?.role === 'employee' && user.id === pr.requesterId && pr.status === 'draft'

  const showRequester = user?.role === 'manager' || user?.role === 'procurement_officer'

  const queryParams = {
    page,
    limit,
    prNumber: filters.prNumber?.trim() || undefined,
    search: filters.search?.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    requesterName: filters.requesterName?.trim() || undefined,
    status: filters.status && filters.status !== 'all' ? filters.status : undefined,
  }

  const { data, isLoading } = usePurchaseRequests(queryParams, { enabled: hasSearched })
  useClampPageToTotal(data?.meta.totalPages)

  const isEmployee = user?.role === 'employee'
  // Numbering follows the page the server returned, not the local state that leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  const handleSubmit = (values: PRListFilterValues) => commit(values)
  const handleClear = () => clear()

  return (
    <div>
      <PageHeader
        title="ใบขอซื้อ"
        description="ค้นหาและเรียกดูใบขอซื้อ"
        action={
          isEmployee ? (
            <Button asChild>
              <Link to="/purchase-requests/new">New PR</Link>
            </Button>
          ) : undefined
        }
      />

      <PRListFilterForm
        key={signature}
        showRequester={showRequester}
        initialValues={hasSearched ? filters : undefined}
        onSubmit={handleSubmit}
        onClear={handleClear}
        canClear={hasSearched}
      />

      {!hasSearched ? (
        <ListSearchPrompt message="กรุณาเลือกช่วงวันที่และกดค้นหาเพื่อดูข้อมูล" />
      ) : isLoading ? (
        <ListLoadingState testId="pr-list-loading" />
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed min-w-[1040px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                  <TableHead className="w-[140px]">เลขที่ PR</TableHead>
                  <TableHead className="min-w-[200px]">ชื่อรายการ</TableHead>
                  <TableHead className="w-[140px]">ผู้ขอ</TableHead>
                  <TableHead className="w-[120px]">สถานะ</TableHead>
                  <TableHead className="w-[140px] text-right">มูลค่า</TableHead>
                  <TableHead className="w-[120px]">วันที่</TableHead>
                  {isEmployee && <TableHead className="w-[120px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <ListEmptyRow colSpan={isEmployee ? 8 : 7} />
                ) : (
                  data?.data.map((pr, i) => (
                    <TableRow
                      key={pr.id}
                      onClick={() => navigate(`/purchase-requests/${pr.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
                      <TableCell className="font-mono text-sm truncate">
                        <RowLink to={`/purchase-requests/${pr.id}`}>{pr.prNumber}</RowLink>
                      </TableCell>
                      <TableCell className="font-medium truncate">{pr.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate">
                        {pr.requester.fullName}
                      </TableCell>
                      <TableCell>
                        <PRStatusBadge status={pr.status as PRStatus} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(Number(pr.totalEstimatedAmount))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(pr.createdAt)}
                      </TableCell>
                      {isEmployee && (
                        <TableCell>
                          {canManageRow(pr) && (
                            <div className="flex items-center gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link
                                  to={`/purchase-requests/${pr.id}/edit`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  แก้ไข
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget(pr)
                                }}
                              >
                                ลบ
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
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
