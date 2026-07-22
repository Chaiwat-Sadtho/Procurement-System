import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatBahtShort } from '@/shared/lib/utils'
import { useBudgets } from '../hooks/useBudgets'
import { useDepartments } from '../hooks/useDepartments'
import type { DashboardBudget } from '../api'

interface BudgetSummaryProps {
  scope: { departmentId?: number }
}

const remaining = (b: DashboardBudget) => b.totalAmount - (b.reservedAmount + b.usedAmount)

export function BudgetSummary({ scope }: BudgetSummaryProps) {
  const currentYear = new Date().getFullYear()
  const isDeptFixed = scope.departmentId !== undefined // manager = fixed dept; PO = selectable
  const [year, setYear] = useState(currentYear)
  const [deptId, setDeptId] = useState<number | undefined>(scope.departmentId)

  const { data, isLoading } = useBudgets({ departmentId: deptId, fiscalYear: year })
  const { data: departments } = useDepartments()

  const yearOptions = [currentYear, currentYear - 1]
  // Tightest budgets first; every row is listed and the card scrolls
  const sorted = [...(data ?? [])].sort((a, b) => remaining(a) - remaining(b))

  return (
    <Card data-testid="budget-summary">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base shrink-0">งบประมาณ</CardTitle>
          <div className="flex items-center gap-2">
            {!isDeptFixed && (
              <Select
                value={deptId !== undefined ? String(deptId) : 'all'}
                onValueChange={(v) => setDeptId(v === 'all' ? undefined : Number(v))}
              >
                <SelectTrigger data-testid="budget-dept-select" className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหน่วยงาน</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger data-testid="budget-year-select" className="h-8 w-[92px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    ปี {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div data-testid="budget-summary-loading" className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีงบสำหรับปีนี้</p>
        ) : (
          // scrolls inside the card instead of a "show all" button; the header stays pinned
          <div className="max-h-72 overflow-y-auto">
            <Table className="min-w-[280px] [&_td]:px-2 [&_th]:px-2">
              <TableHeader className="sticky top-0 z-10 bg-table-header text-table-header-foreground">
                <TableRow>
                  <TableHead>หน่วยงาน</TableHead>
                  <TableHead>รอบ</TableHead>
                  <TableHead className="text-right">ใช้ / งบ</TableHead>
                  <TableHead className="w-[100px]">% ใช้แล้ว</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((b) => {
                  const used = b.reservedAmount + b.usedAmount
                  const percent = b.totalAmount > 0 ? Math.min(100, (used / b.totalAmount) * 100) : 0
                  const warn = percent > 80
                  return (
                    <TableRow key={b.id} data-testid="budget-row">
                      <TableCell className="font-medium">
                        {b.department?.name ?? `แผนก #${b.departmentId}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.quarter ? `Q${b.quarter}` : 'รายปี'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-sm">
                        {formatBahtShort(used)} / {formatBahtShort(b.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                            <div
                              className={`h-full rounded ${warn ? 'bg-destructive' : 'bg-primary'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span
                            data-testid={warn ? `budget-warn-${b.id}` : undefined}
                            className={`w-12 text-right font-mono tabular-nums text-xs ${
                              warn ? 'text-destructive font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
