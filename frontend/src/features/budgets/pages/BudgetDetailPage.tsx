import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { formatCurrency } from '@/shared/lib/utils'
import { useBudgetSummary } from '../hooks/useBudgetSummary'
import { useBudgetTransactions } from '../hooks/useBudgetTransactions'
import { BudgetBreakdownBar } from '../components/BudgetBreakdownBar'
import { BudgetTransactionsTable } from '../components/BudgetTransactionsTable'

function periodLabel(fiscalYear: number, quarter: number | null): string {
  return quarter == null ? `${fiscalYear} รายปี` : `${fiscalYear} Q${quarter}`
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  )
}

export function BudgetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const budgetId = Number(id)
  const validId = Number.isInteger(budgetId) && budgetId > 0

  const { data: budget, isLoading, isError } = useBudgetSummary(validId ? budgetId : 0)
  const { data: transactions, isError: txnsError } = useBudgetTransactions(validId ? budgetId : 0)
  const { data: user } = useCurrentUser()
  const canEdit = user?.role === 'procurement_officer'

  if (!validId || isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ไม่พบงบประมาณนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</AlertTitle>
        <AlertDescription>
          <Link to="/budgets" className="underline">
            กลับไปรายการ
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !budget) {
    return (
      <div data-testid="budget-detail-loading" className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={budget.department?.name ?? `งบประมาณ #${budget.id}`}
        description={periodLabel(budget.fiscalYear, budget.quarter)}
        action={
          canEdit ? (
            <Button onClick={() => navigate(`/budgets/${budget.id}/edit`)}>แก้ไขงบประมาณ</Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="งบทั้งหมด" value={budget.totalAmount} />
        <SummaryCard label="จองแล้ว" value={budget.reservedAmount} />
        <SummaryCard label="ใช้จริง" value={budget.usedAmount} />
        <SummaryCard label="คงเหลือ" value={budget.remaining} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">สัดส่วนการใช้งบ</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetBreakdownBar
            total={budget.totalAmount}
            reserved={budget.reservedAmount}
            used={budget.usedAmount}
            usagePercent={budget.usagePercent}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">รายการที่ใช้งบ (money trail)</h2>
        {txnsError ? (
          <p className="py-8 text-center text-muted-foreground">โหลดรายการเคลื่อนไหวงบไม่สำเร็จ</p>
        ) : (
          <BudgetTransactionsTable transactions={transactions ?? []} />
        )}
      </div>
    </div>
  )
}
