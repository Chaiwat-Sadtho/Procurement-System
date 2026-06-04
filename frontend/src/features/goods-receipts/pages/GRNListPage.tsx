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
import { formatDate, getRowIndex } from '@/shared/lib/utils'
import { GrnStatusBadge } from '../components/GrnStatusBadge'
import {
  GRNListFilterForm,
  type GRNListFilterValues,
} from '../components/GRNListFilterForm'
import { useGoodsReceipts } from '../hooks/useGoodsReceipts'
import { useReceivablePOs } from '../hooks/useReceivablePOs'
import type { GrnStatus } from '../types'

const DEFAULT_FILTERS: GRNListFilterValues = {
  status: 'all',
  poId: 'all',
}

export function GRNListPage() {
  const navigate = useNavigate()
  const { page, limit, nextPage, prevPage, setLimit, setPage } = usePagination()
  const [filters, setFilters] = useState<GRNListFilterValues>(DEFAULT_FILTERS)

  const { data: user } = useCurrentUser()
  const canCreate = user?.role === 'procurement_officer'

  const { data: pos } = useReceivablePOs()
  const poOptions = pos ?? []

  const queryParams = {
    page,
    limit,
    status:
      filters.status && filters.status !== 'all' ? (filters.status as GrnStatus) : undefined,
    poId: filters.poId && filters.poId !== 'all' ? Number(filters.poId) : undefined,
  }

  const { data, isLoading, isError, refetch } = useGoodsReceipts(queryParams, { enabled: true })

  // running number sticks to the page the server actually returned (meta),
  // not the local page state which momentarily leads the fetch
  const displayPage = data?.meta.page ?? page
  const displayLimit = data?.meta.limit ?? limit

  const handleSubmit = (values: GRNListFilterValues) => {
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
        title="การรับของ (GRN)"
        description="ค้นหาและเรียกดูใบรับของ"
        action={
          canCreate ? (
            <Button onClick={() => navigate('/goods-receipts/new')}>บันทึกการรับของ</Button>
          ) : undefined
        }
      />

      <GRNListFilterForm pos={poOptions} onSubmit={handleSubmit} onClear={handleClear} />

      {isError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">โหลดข้อมูลการรับของไม่สำเร็จ</p>
          <Button variant="outline" onClick={() => refetch()}>
            ลองใหม่
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="grn-list-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table className="table-fixed min-w-[900px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                  <TableHead className="w-[160px]">เลขที่ GRN</TableHead>
                  <TableHead className="w-[130px]">วันที่รับ</TableHead>
                  <TableHead className="min-w-[160px]">PO</TableHead>
                  <TableHead className="w-[140px]">สถานะ</TableHead>
                  <TableHead className="w-[120px] text-right">จำนวนรายการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลตามเงื่อนไข
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((grn, i) => (
                    <TableRow
                      key={grn.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => navigate(`/goods-receipts/${grn.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/goods-receipts/${grn.id}`)
                        }
                      }}
                      className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums truncate">
                        {grn.grnNumber}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(grn.receivedDate)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums truncate">
                        {grn.purchaseOrder?.poNumber ?? '—'}
                      </TableCell>
                      <TableCell>
                        <GrnStatusBadge status={grn.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {grn.items.length}
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
