import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { PageHeader } from '@/shared/components/PageHeader'
import { ListLoadingState } from '@/shared/components/ListLoadingState'
import { ListErrorState } from '@/shared/components/ListErrorState'
import { ListEmptyRow } from '@/shared/components/ListEmptyRow'
import { ListPaginationFooter } from '@/shared/components/ListPaginationFooter'
import { RowLink } from '@/shared/components/RowLink'
import { ListSearchPrompt } from '@/shared/components/ListSearchPrompt'
import { usePagination, useClampPageToTotal } from '@/shared/hooks/usePagination'
import { formatCurrency, formatDate, getRowIndex } from '@/shared/lib/utils'
import { POStatusBadge } from '../components/POStatusBadge'
import { POListFilterForm, type POListFilterValues } from '../components/POListFilterForm'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { useVendors } from '@/features/vendors/hooks/useVendors'
import { useUrlFilters } from '@/shared/hooks/useUrlFilters'
import { poUrlFilterConfig } from '../lib/poUrlFilters'
import type { PoStatus } from '../types'

export function POListPage() {
  const navigate = useNavigate()
  const { page, limit, nextPage, prevPage, setLimit } = usePagination()
  const { filters, hasSearched, signature, commit, clear } = useUrlFilters(poUrlFilterConfig)

  const { data: user } = useCurrentUser()
  const canCreate = user?.role === 'procurement_officer'

  const { data: vendorData } = useVendors({ limit: 100 })
  const vendors = vendorData?.data ?? []

  const queryParams = {
    page,
    limit,
    status: filters.status && filters.status !== 'all' ? (filters.status as PoStatus) : undefined,
    vendorId: filters.vendorId && filters.vendorId !== 'all' ? Number(filters.vendorId) : undefined,
  }

  const { data, isLoading, isError, refetch } = usePurchaseOrders(queryParams, {
    enabled: hasSearched,
  })
  useClampPageToTotal(data?.meta.totalPages)

  // Numbering follows the page the server returned, not the local state that leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  const handleSubmit = (values: POListFilterValues) => commit(values)
  const handleClear = () => clear()

  return (
    <div>
      <PageHeader
        title="ใบสั่งซื้อ"
        description="ค้นหาและเรียกดูใบสั่งซื้อ"
        action={
          canCreate ? (
            <Button onClick={() => navigate('/purchase-orders/new')}>สร้างใบสั่งซื้อ</Button>
          ) : undefined
        }
      />

      <POListFilterForm
        key={signature}
        vendors={vendors}
        initialValues={filters}
        onSubmit={handleSubmit}
        onClear={handleClear}
        canClear={hasSearched}
      />

      {!hasSearched ? (
        <ListSearchPrompt
          message="เลือกเงื่อนไขแล้วกดค้นหาเพื่อแสดงใบสั่งซื้อ"
          testId="po-search-prompt"
        />
      ) : isError ? (
        <ListErrorState message="โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ" onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListLoadingState testId="po-list-loading" />
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed min-w-[1100px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                  <TableHead className="w-[150px]">เลขที่ PO</TableHead>
                  <TableHead className="w-[140px]">PR</TableHead>
                  <TableHead className="min-w-[200px]">ผู้ขาย</TableHead>
                  <TableHead className="w-[130px]">สถานะ</TableHead>
                  <TableHead className="w-[140px] text-right">ยอดรวม</TableHead>
                  <TableHead className="w-[120px]">กำหนดส่ง</TableHead>
                  <TableHead className="w-[120px]">วันที่สร้าง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.data.length === 0 ? (
                  <ListEmptyRow colSpan={8} />
                ) : (
                  data.data.map((po, i) => (
                    <TableRow
                      key={po.id}
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums truncate">
                        <RowLink to={`/purchase-orders/${po.id}`}>{po.poNumber}</RowLink>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums truncate">
                        {po.purchaseRequest?.prNumber ?? '—'}
                      </TableCell>
                      <TableCell className="font-medium truncate">
                        {po.vendor?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <POStatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(Number(po.totalAmount))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(po.expectedDeliveryDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(po.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.meta.total > 0 && (
            <ListPaginationFooter
              summary={`หน้า ${data.meta.page} จาก ${data.meta.totalPages} (${data.meta.total} รายการ)`}
              page={page}
              totalPages={data.meta.totalPages}
              limit={limit}
              onPrev={prevPage}
              onNext={nextPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}
    </div>
  )
}
