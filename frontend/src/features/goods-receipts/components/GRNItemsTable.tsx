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

// Detail read-only received items (spec §6: ชื่อสินค้า | สั่ง | รับครั้งนี้ | สภาพ).
// GRN has no total → no footer (cf. POItemsTable). Decimals are string → Number() for display.
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
