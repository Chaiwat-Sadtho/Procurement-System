import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Progress } from '@/shared/components/ui/progress'
import { formatCurrency } from '@/shared/lib/utils'
import type { POItem } from '../types'

interface POItemsTableProps {
  items: POItem[]
  totalAmount: number
}

function receivedPercent(received: number, quantity: number): number {
  if (quantity <= 0) return 0
  const pct = (received / quantity) * 100
  return Math.max(0, Math.min(100, pct))
}

export function POItemsTable({ items, totalAmount }: POItemsTableProps) {
  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-table-header text-table-header-foreground">
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>รายการ</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead>หน่วย</TableHead>
              <TableHead className="text-right">ราคา/หน่วย</TableHead>
              <TableHead className="text-right">รวม</TableHead>
              <TableHead>รับแล้ว</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const qty = Number(item.quantity)
              const received = Number(item.receivedQuantity)
              const pct = receivedPercent(received, qty)
              return (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.itemName}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{qty}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(Number(item.totalPrice))}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className="font-mono tabular-nums text-xs text-muted-foreground">
                        {received} / {qty}
                      </span>
                      <Progress value={pct} className="h-2" />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 flex justify-end pr-4">
        <span className="text-sm font-semibold font-mono tabular-nums">
          {`รวม: ${formatCurrency(totalAmount)}`}
        </span>
      </div>
    </div>
  )
}
