import { TableCell, TableRow } from '@/shared/components/ui/table'

interface ListEmptyRowProps {
  /** number of table columns to span (keep in sync with the header) */
  colSpan: number
  message?: string
}

/**
 * Empty-state row for list tables. The message lives in a polite status region
 * so screen readers announce "no results" when a filter clears the table,
 * instead of leaving the user on a silently empty grid.
 */
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
