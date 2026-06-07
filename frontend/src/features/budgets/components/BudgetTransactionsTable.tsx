import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { POStatusBadge } from '@/features/purchase-orders/components/POStatusBadge'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import type { BudgetTransaction } from '../types'

interface BudgetTransactionsTableProps {
  transactions: BudgetTransaction[]
}

export function BudgetTransactionsTable({ transactions }: BudgetTransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">ยังไม่มี PR ที่อนุมัติใช้งบก้อนนี้</p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table className="table-fixed min-w-[900px]">
        <TableHeader className="bg-table-header text-table-header-foreground">
          <TableRow>
            <TableHead className="w-[150px]">PR</TableHead>
            <TableHead className="w-[150px]">PO</TableHead>
            <TableHead className="w-[140px]">สถานะ</TableHead>
            <TableHead className="min-w-[160px]">ผู้ขอ</TableHead>
            <TableHead className="w-[120px]">วันอนุมัติ</TableHead>
            <TableHead className="w-[150px] text-right">ยอด</TableHead>
            <TableHead className="w-[110px]">นับเป็น</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.prId}>
              <TableCell className="font-mono tabular-nums truncate">{t.prNumber}</TableCell>
              <TableCell className="font-mono tabular-nums truncate">{t.poNumber ?? '—'}</TableCell>
              <TableCell>
                {t.poStatus ? (
                  <POStatusBadge status={t.poStatus} />
                ) : (
                  <Badge variant="success">อนุมัติแล้ว</Badge>
                )}
              </TableCell>
              <TableCell className="truncate">{t.requesterName || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {t.approvedAt ? formatDate(t.approvedAt) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(t.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={t.bucket === 'used' ? 'default' : 'warning'}>
                  {t.bucket === 'used' ? 'ใช้จริง' : 'จองแล้ว'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
