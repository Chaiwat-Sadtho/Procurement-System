import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'

const rowLinkClass =
  'rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'

interface RowLinkProps {
  to: string
  children: ReactNode
  className?: string
}

/**
 * Accessible link for the primary cell of a clickable list row.
 *
 * The row keeps a mouse-only onClick for the whole-row hit target, but the
 * keyboard / screen-reader navigation path is THIS real `<a href>`. That keeps
 * the row a native table row (no role="button" clobbering the grid/cell
 * semantics) and lets Cmd/Ctrl/middle-click open the detail in a new tab.
 *
 * stopPropagation keeps a click on the link from also firing the row's onClick
 * (which would push the same route twice).
 */
export function RowLink({ to, children, className }: RowLinkProps) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className={cn(rowLinkClass, className)}>
      {children}
    </Link>
  )
}
