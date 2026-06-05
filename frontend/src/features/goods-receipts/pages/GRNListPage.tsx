import { useState } from 'react'
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
        <ListErrorState message="โหลดข้อมูลการรับของไม่สำเร็จ" onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListLoadingState testId="grn-list-loading" />
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
                  <ListEmptyRow colSpan={6} />
                ) : (
                  data.data.map((grn, i) => (
                    <TableRow
                      key={grn.id}
                      onClick={() => navigate(`/goods-receipts/${grn.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="text-center">
                        {getRowIndex(displayPage, displayLimit, i)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums truncate">
                        <RowLink to={`/goods-receipts/${grn.id}`}>{grn.grnNumber}</RowLink>
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
