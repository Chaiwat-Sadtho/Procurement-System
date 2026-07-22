import { TableCell, TableRow } from '@/shared/components/ui/table'

interface ListEmptyRowProps {
  /** number of table columns to span (keep in sync with the header) */
  colSpan: number
  message?: string
}

/** Empty-state row; the message is a polite status region so "no results" is announced after filtering. */
export function ListEmptyRow({ colSpan, message = 'ไม่พบข้อมูลตามเงื่อนไข' }: ListEmptyRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
        <span role="status" aria-live="polite">
          {message}
        </span>
      </TableCell>
    </TableRow>
  )
}
