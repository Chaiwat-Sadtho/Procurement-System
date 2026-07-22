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
 * Accessible link for the primary cell of a clickable list row. The row's own onClick stays
 * mouse-only; this real `<a href>` carries keyboard and screen-reader navigation, keeps the row a
 * native table row, and supports Cmd/Ctrl/middle-click. stopPropagation prevents a double push.
 */
export function RowLink({ to, children, className }: RowLinkProps) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className={cn(rowLinkClass, className)}>
      {children}
    </Link>
  )
}
