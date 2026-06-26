import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { RowLink } from '@/shared/components/RowLink'
import { formatDate } from '@/shared/lib/utils'
import { PRStatusBadge } from '@/features/purchase-requests/components/PRStatusBadge'
import { useRecentPRs } from '../hooks/useRecentPRs'

export function RecentPRsTable() {
  const { data, isLoading } = useRecentPRs()
  const navigate = useNavigate()

  return (
    <div data-testid="recent-prs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h2 className="text-lg font-semibold">PR ล่าสุด</h2>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link to="/purchase-requests">ดูทั้งหมด</Link>
        </Button>
      </div>
      {isLoading ? (
        <div data-testid="recent-prs-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-table-header text-table-header-foreground">
              <TableRow>
                <TableHead>เลขที่ PR</TableHead>
                <TableHead>ชื่อรายการ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    ยังไม่มีข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                data.map((pr) => (
                  <TableRow
                    key={pr.id}
                    onClick={() => navigate(`/purchase-requests/${pr.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-sm">
                      <RowLink to={`/purchase-requests/${pr.id}`}>{pr.prNumber}</RowLink>
                    </TableCell>
                    <TableCell className="font-medium">{pr.title}</TableCell>
                    <TableCell>
                      <PRStatusBadge status={pr.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(pr.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
