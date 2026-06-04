import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { GrnStatusBadge } from '@/features/goods-receipts/components/GrnStatusBadge'
import { formatDate } from '@/shared/lib/utils'
import type { GoodsReceiptSummary } from '../types'

interface POGrnHistoryProps {
  grns: GoodsReceiptSummary[]
}

export function POGrnHistory({ grns }: POGrnHistoryProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">ประวัติการรับของ (GRN)</h2>
      {grns.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีการรับของ</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-table-header text-table-header-foreground">
              <TableRow>
                <TableHead>เลขที่</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จำนวนรายการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-mono">{grn.grnNumber}</TableCell>
                  <TableCell>{formatDate(grn.receivedDate)}</TableCell>
                  <TableCell>
                    <GrnStatusBadge status={grn.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {grn.items.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
