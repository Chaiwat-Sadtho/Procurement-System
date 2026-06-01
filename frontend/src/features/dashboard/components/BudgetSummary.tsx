import { Card, CardContent } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrency } from '@/shared/lib/utils'
import { useBudgets } from '../hooks/useBudgets'

interface BudgetSummaryProps {
  scope: { departmentId?: number }
}

export function BudgetSummary({ scope }: BudgetSummaryProps) {
  const fiscalYear = new Date().getFullYear()
  const { data, isLoading } = useBudgets({ departmentId: scope.departmentId, fiscalYear })

  return (
    <div data-testid="budget-summary">
      <h2 className="text-lg font-semibold mb-3">งบประมาณ (ปี {fiscalYear})</h2>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีงบสำหรับปีนี้</p>
      ) : (
        <div className="space-y-3">
          {data.map((b) => {
            const used = b.reservedAmount + b.usedAmount
            const percent = b.totalAmount > 0 ? Math.min(100, (used / b.totalAmount) * 100) : 0
            const warn = percent > 80
            return (
              <Card key={b.id}>
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
        </div>
      )}
    </div>
  )
}
