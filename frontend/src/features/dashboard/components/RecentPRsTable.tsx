import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { formatDate } from '@/shared/lib/utils'
import { PRStatusBadge } from '@/features/purchase-requests/components/PRStatusBadge'
import { useRecentPRs } from '../hooks/useRecentPRs'

export function RecentPRsTable() {
  const { data, isLoading } = useRecentPRs()

  return (
    <div data-testid="recent-prs">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">PR ล่าสุด</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/purchase-requests">ดูทั้งหมด</Link>
        </Button>
      </div>
      {isLoading ? (
        <div data-testid="recent-prs-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">ยังไม่มีข้อมูล</TableCell>
                </TableRow>
              ) : (
                data.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono text-sm">{pr.prNumber}</TableCell>
                    <TableCell className="font-medium">{pr.title}</TableCell>
                    <TableCell><PRStatusBadge status={pr.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(pr.createdAt)}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm"><Link to={`/purchase-requests/${pr.id}`}>View</Link></Button>
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
