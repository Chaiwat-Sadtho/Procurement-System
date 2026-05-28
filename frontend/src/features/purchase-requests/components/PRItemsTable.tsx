import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatCurrency } from '@/shared/lib/utils'
import type { PRItem } from '../types'

interface PRItemsTableProps {
  items: PRItem[]
  totalEstimatedAmount: number
}

export function PRItemsTable({ items, totalEstimatedAmount }: PRItemsTableProps) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{item.itemName}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                )}
              </TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.estimatedUnitPrice)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.estimatedTotalPrice)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-2 pr-4">
        <span className="text-sm font-semibold">
          Total: {formatCurrency(totalEstimatedAmount)}
        </span>
      </div>
    </div>
  )
}
