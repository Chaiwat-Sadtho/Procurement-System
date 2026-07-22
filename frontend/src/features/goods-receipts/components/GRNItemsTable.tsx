import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { GoodsReceiptItem } from '../types'
import { GrnConditionBadge } from './GrnConditionBadge'

interface GRNItemsTableProps {
  items: GoodsReceiptItem[]
}

// Read-only received items; a GRN carries no total, so there is no footer row
export function GRNItemsTable({ items }: GRNItemsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-table-header text-table-header-foreground">
          <TableRow>
            <TableHead>ชื่อสินค้า</TableHead>
            <TableHead className="text-right">สั่ง</TableHead>
            <TableHead className="text-right">รับครั้งนี้</TableHead>
            <TableHead>สภาพ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.poItem?.itemName ?? '-'}</div>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {item.poItem ? Number(item.poItem.quantity) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {Number(item.receivedQuantity)}
              </TableCell>
              <TableCell>
                <GrnConditionBadge condition={item.condition} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
