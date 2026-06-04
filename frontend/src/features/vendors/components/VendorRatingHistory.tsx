import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { StarRating } from '@/shared/components/StarRating'
import { RowLink } from '@/shared/components/RowLink'
import { ListLoadingState } from '@/shared/components/ListLoadingState'
import { ListErrorState } from '@/shared/components/ListErrorState'
import { ListEmptyRow } from '@/shared/components/ListEmptyRow'
import { ListPaginationFooter } from '@/shared/components/ListPaginationFooter'
import { formatDate } from '@/shared/lib/utils'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { useVendorRatings } from '../hooks/useVendorRatings'

const COLS = 5

interface VendorRatingHistoryProps {
  vendorId: number
}

export function VendorRatingHistory({ vendorId }: VendorRatingHistoryProps) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { data, isLoading, isError, error, refetch } = useVendorRatings(vendorId, { page, limit })

  return (
    <div className="space-y-2 mt-8">
      <h2 className="text-base font-semibold">ประวัติการให้คะแนน</h2>
      {isLoading ? (
        <ListLoadingState rows={3} />
      ) : isError ? (
        <ListErrorState message={getApiErrorMessage(error, 'โหลดประวัติคะแนนไม่สำเร็จ')} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table className="table-fixed min-w-[720px]">
              <TableHeader className="bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead className="w-[170px]">คะแนน</TableHead>
                  <TableHead>ความคิดเห็น</TableHead>
                  <TableHead className="w-[150px]">ใบสั่งซื้อ</TableHead>
                  <TableHead className="w-[170px]">ผู้ให้คะแนน</TableHead>
                  <TableHead className="w-[130px]">วันที่</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.data.length > 0 ? (
                  data.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StarRating value={r.score} readOnly />
                          <span className="text-xs text-muted-foreground">({r.score}/5)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.comment ?? '—'}</TableCell>
                      <TableCell>
                        <RowLink to={`/purchase-orders/${r.poId}`} className="font-mono text-primary">
                          {r.purchaseOrder.poNumber}
                        </RowLink>
                      </TableCell>
                      <TableCell>{r.ratedBy.fullName}</TableCell>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <ListEmptyRow colSpan={COLS} message="ยังไม่มีการให้คะแนน" />
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.meta.total > 0 && (
            <ListPaginationFooter
              summary={`หน้า ${data.meta.page} จาก ${data.meta.totalPages} (ทั้งหมด ${data.meta.total} รายการ)`}
              page={page}
              totalPages={data.meta.totalPages}
              limit={limit}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
              onLimitChange={(l) => {
                setLimit(l)
                setPage(1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
