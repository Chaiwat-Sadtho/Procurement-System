import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/shared/components/PageHeader'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Button } from '@/shared/components/ui/button'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'
import { useBudgetSummary } from '../hooks/useBudgetSummary'
import { BudgetForm } from '../components/BudgetForm'
import { createDefaultValues, budgetToFormValues } from '../lib/budgetFormSchema'

function Notice({ message, to }: { message: string; to?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
      <p>{message}</p>
      {to && (
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to={to}>กลับ</Link>
        </Button>
      )}
    </div>
  )
}

export function BudgetFormPage() {
  const { id } = useParams()
  const isEdit = id != null
  const budgetId = Number(id)
  const { data: departments } = useDepartments()
  const { data: budget, isLoading, isError } = useBudgetSummary(isEdit ? budgetId : 0)

  if (!isEdit) {
    return (
      <div>
        <PageHeader title="สร้างงบประมาณ" description="กำหนดงบประมาณรายแผนก/ปี/ไตรมาส" />
        <BudgetForm
          mode="create"
          departments={departments ?? []}
          defaultValues={createDefaultValues()}
        />
      </div>
    )
  }

  if (isLoading) return <LoadingSpinner />
  if (isError || !budget) return <Notice message="ไม่พบงบประมาณ" to="/budgets" />

  const committed = budget.reservedAmount + budget.usedAmount

  return (
    <div>
      <PageHeader title="แก้ไขงบประมาณ" description="ปรับยอดงบทั้งหมด (ห้ามต่ำกว่ายอดที่ผูกพันแล้ว)" />
      {/* key=budgetId ให้ remount เมื่อสลับ id (re-seed defaultValues) */}
      <BudgetForm
        key={budgetId}
        mode="edit"
        budgetId={budgetId}
        committed={committed}
        departments={departments ?? []}
        defaultValues={budgetToFormValues(budget)}
      />
    </div>
  )
}
