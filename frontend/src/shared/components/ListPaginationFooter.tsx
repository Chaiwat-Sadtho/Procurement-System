import { Button } from '@/shared/components/ui/button'
import { PageSizeSelect } from '@/shared/components/PageSizeSelect'

interface ListPaginationFooterProps {
  /** page-specific summary text, e.g. "page X of Y" */
  summary: string
  page: number
  totalPages: number
  limit: number
  onPrev: () => void
  onNext: () => void
  onLimitChange: (limit: number) => void
  prevLabel?: string
  nextLabel?: string
}

/** Pagination footer for list pages; the summary is a polite status region so navigation is announced. */
export function ListPaginationFooter({
  summary,
  page,
  totalPages,
  limit,
  onPrev,
  onNext,
  onLimitChange,
  prevLabel = 'ก่อนหน้า',
  nextLabel = 'ถัดไป',
}: ListPaginationFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {summary}
      </span>
      <div className="flex items-center gap-4">
        <PageSizeSelect value={limit} onChange={onLimitChange} />
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>
              {prevLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
              {nextLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
