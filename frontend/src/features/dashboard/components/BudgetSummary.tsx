import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { formatCurrency } from '@/shared/lib/utils'
import { useBudgets } from '../hooks/useBudgets'
import { useDepartments } from '../hooks/useDepartments'
import type { DashboardBudget } from '../api'

interface BudgetSummaryProps {
  scope: { departmentId?: number }
}

const COLLAPSED_COUNT = 4
const remaining = (b: DashboardBudget) => b.totalAmount - (b.reservedAmount + b.usedAmount)

export function BudgetSummary({ scope }: BudgetSummaryProps) {
  const currentYear = new Date().getFullYear()
  const isDeptFixed = scope.departmentId !== undefined // manager = fixed dept; PO = selectable
  const [year, setYear] = useState(currentYear)
  const [deptId, setDeptId] = useState<number | undefined>(scope.departmentId)
  const [showAll, setShowAll] = useState(false)

  const { data, isLoading } = useBudgets({ departmentId: deptId, fiscalYear: year })
  const { data: departments } = useDepartments()

  const yearOptions = [currentYear, currentYear - 1]
  // เรียงงบเหลือน้อยสุดก่อน (วิกฤตสุดอยู่บน)
  const sorted = [...(data ?? [])].sort((a, b) => remaining(a) - remaining(b))
  const canCollapse = deptId === undefined && sorted.length > COLLAPSED_COUNT
  const collapsed = canCollapse && !showAll
  const visible = collapsed ? sorted.slice(0, COLLAPSED_COUNT) : sorted

  return (
    <div data-testid="budget-summary">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">งบประมาณ</h2>
        <div className="flex items-center gap-2">
          {!isDeptFixed && (
            <Select
              value={deptId !== undefined ? String(deptId) : 'all'}
              onValueChange={(v) => {
                setDeptId(v === 'all' ? undefined : Number(v))
                setShowAll(false)
              }}
            >
              <SelectTrigger data-testid="budget-dept-select" className="h-8 w-[150px]">
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
            <SelectTrigger data-testid="budget-year-select" className="h-8 w-[100px]">
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

      {isLoading ? (
        <div data-testid="budget-summary-loading" className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีงบสำหรับปีนี้</p>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => {
            const used = b.reservedAmount + b.usedAmount
            const percent = b.totalAmount > 0 ? Math.min(100, (used / b.totalAmount) * 100) : 0
            const warn = percent > 80
            return (
              <Card key={b.id} data-testid="budget-row">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{b.department?.name ?? `แผนก #${b.departmentId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.quarter ? `Q${b.quarter}` : 'Annual'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(used)} / {formatCurrency(b.totalAmount)}</p>
                      <p
                        data-testid={warn ? `budget-warn-${b.id}` : undefined}
                        className={`text-xs ${warn ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                      >
                        {percent.toFixed(0)}% used{warn ? ' — เกิน 80%!' : ''}
                      </p>
                    </div>
                  </div>
                  <Progress value={percent} className={warn ? '[&>div]:bg-destructive' : ''} />
                </CardContent>
              </Card>
            )
          })}
          {canCollapse && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAll((s) => !s)}
            >
              {showAll ? 'ย่อ' : `แสดงทั้งหมด (${sorted.length})`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
