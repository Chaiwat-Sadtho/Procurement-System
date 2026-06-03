import type * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn, formatCurrency } from '@/shared/lib/utils'
import type { DashboardBudget } from '@/features/dashboard/api'

interface POBudgetPreviewProps {
  budget: DashboardBudget | null
  prEstimate: number
  poTotal: number
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

export function POBudgetPreview({ budget, prEstimate, poTotal }: POBudgetPreviewProps) {
  if (!budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">งบประมาณ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">งบประมาณยังไม่ถูกกำหนด</p>
        </CardContent>
      </Card>
    )
  }

  const total = Number(budget.totalAmount)
  const reserved = Number(budget.reservedAmount)
  const used = Number(budget.usedAmount)
  // §4A: remaining is computed client-side (not present in the /budgets array)
  const remaining = total - reserved - used

  const delta = Number(poTotal) - Number(prEstimate)
  const remainingAfter = remaining - delta
  const afterOk = remainingAfter >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">งบประมาณ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row label="งบทั้งหมด" value={formatCurrency(total)} />
        <Row label="ใช้ไปแล้ว" value={formatCurrency(used)} />
        <Row label="จองไว้" value={formatCurrency(reserved)} />
        <Row label="คงเหลือ" value={formatCurrency(remaining)} />

        {delta > 0 && <Row label="ต้องจองเพิ่ม" value={formatCurrency(delta)} />}

        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span>คงเหลือหลังสร้าง PO</span>
          <span
            data-testid="po-budget-remaining-after"
            className={cn(
              'font-mono tabular-nums',
              afterOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
            )}
          >
            {formatCurrency(remainingAfter)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
