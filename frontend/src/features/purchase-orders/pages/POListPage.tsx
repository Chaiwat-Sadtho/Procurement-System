import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
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
import { PageSizeSelect } from '@/shared/components/PageSizeSelect'
import { usePagination } from '@/shared/hooks/usePagination'
import { formatCurrency, formatDate, getRowIndex } from '@/shared/lib/utils'
import { POStatusBadge } from '../components/POStatusBadge'
import {
  POListFilterForm,
  type POListFilterValues,
} from '../components/POListFilterForm'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { useVendors } from '@/features/vendors/hooks/useVendors'
import type { PoStatus } from '../types'

const DEFAULT_FILTERS: POListFilterValues = {
  status: 'all',
  vendorId: 'all',
}

export function POListPage() {
  const navigate = useNavigate()
  const { page, limit, nextPage, prevPage, setLimit, setPage } = usePagination()
  const [filters, setFilters] = useState<POListFilterValues>(DEFAULT_FILTERS)

  const { data: user } = useCurrentUser()
  const canCreate = user?.role === 'procurement_officer'

  const { data: vendorData } = useVendors({ limit: 100 })
  const vendors = vendorData?.data ?? []

  const queryParams = {
    page,
    limit,
    status:
      filters.status && filters.status !== 'all' ? (filters.status as PoStatus) : undefined,
    vendorId:
      filters.vendorId && filters.vendorId !== 'all' ? Number(filters.vendorId) : undefined,
  }

  const { data, isLoading, isError, refetch } = usePurchaseOrders(queryParams, { enabled: true })

  // running number sticks to the page the server actually returned (meta),
  // not the local page state which momentarily leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  const handleSubmit = (values: POListFilterValues) => {
    setPage(1)
    setFilters(values)
  }

  const handleClear = () => {
    setPage(1)
    setFilters(DEFAULT_FILTERS)
  }

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

      <POListFilterForm vendors={vendors} onSubmit={handleSubmit} onClear={handleClear} />

      {isError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ</p>
          <Button variant="outline" onClick={() => refetch()}>
            ลองใหม่
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="po-list-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลตามเงื่อนไข
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((po, i) => (
                    <TableRow
                      key={po.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/purchase-orders/${po.id}`)
                        }
                      }}
                      className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums truncate">
                        {po.poNumber}
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
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="text-sm text-muted-foreground">
                หน้า {data.meta.page} จาก {data.meta.totalPages} ({data.meta.total} รายการ)
              </span>
              <div className="flex items-center gap-4">
                <PageSizeSelect value={limit} onChange={setLimit} />
                {data.meta.totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={prevPage} disabled={page <= 1}>
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={page >= data.meta.totalPages}
                    >
                      ถัดไป
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
