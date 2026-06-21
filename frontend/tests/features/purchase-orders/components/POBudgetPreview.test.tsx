import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatCurrency } from '@/shared/lib/utils'
import type { DashboardBudget } from '@/features/dashboard/api'
import { POBudgetPreview } from '@/features/purchase-orders/components/POBudgetPreview'

const budget: DashboardBudget = {
  id: 1,
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  fiscalYear: 2026,
  quarter: 2,
  totalAmount: 100000,
  reservedAmount: 30000,
  usedAmount: 10000,
}
// remaining = 100000 - 30000 - 10000 = 60000

describe('POBudgetPreview', () => {
  it('shows the no-budget message when budget is null', () => {
    render(<POBudgetPreview budget={null} prEstimate={1000} poTotal={1000} />)
    expect(screen.getByText('งบประมาณยังไม่ถูกกำหนด')).toBeInTheDocument()
  })

  it('renders total, used, reserved and computed remaining', () => {
    // poTotal != prEstimate so remaining (60000) and remainingAfter (55000) are distinct
    render(<POBudgetPreview budget={budget} prEstimate={20000} poTotal={25000} />)
    expect(screen.getByText(formatCurrency(100000))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(10000))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(30000))).toBeInTheDocument()
    // remaining computed client-side = 60000 (collision-proof: only the คงเหลือ row shows it)
    expect(screen.getAllByText(formatCurrency(60000)).length).toBeGreaterThanOrEqual(1)
  })

  it('shows "ต้องจองเพิ่ม" only when delta is positive', () => {
    // PO total 25000 > PR estimate 20000 -> delta 5000 > 0
    render(<POBudgetPreview budget={budget} prEstimate={20000} poTotal={25000} />)
    expect(screen.getByText(/ต้องจองเพิ่ม/)).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(5000))).toBeInTheDocument()
  })

  it('hides "ต้องจองเพิ่ม" when delta is negative', () => {
    // PO cheaper than PR estimate -> delta < 0
    render(<POBudgetPreview budget={budget} prEstimate={20000} poTotal={15000} />)
    expect(screen.queryByText(/ต้องจองเพิ่ม/)).not.toBeInTheDocument()
  })

  it('hides "ต้องจองเพิ่ม" at the exact delta===0 boundary', () => {
    // poTotal === prEstimate -> delta 0; "only when delta > 0" must keep it hidden
    // (pins the strict > 0 boundary: a >= 0 mutant would wrongly show ต้องจองเพิ่ม = 0 here)
    render(<POBudgetPreview budget={budget} prEstimate={20000} poTotal={20000} />)
    expect(screen.queryByText(/ต้องจองเพิ่ม/)).not.toBeInTheDocument()
  })

  it('shows remainingAfter in green when >= 0', () => {
    // delta 5000, remaining 60000 -> remainingAfter 55000 (>=0)
    render(<POBudgetPreview budget={budget} prEstimate={20000} poTotal={25000} />)
    const after = screen.getByTestId('po-budget-remaining-after')
    expect(after.textContent).toContain(formatCurrency(55000))
    expect(after.className).toMatch(/text-emerald-600/)
  })

  it('shows remainingAfter in red when < 0 (delta exceeds remaining)', () => {
    // PR estimate 0, PO 70000 -> delta 70000 > remaining 60000 -> remainingAfter -10000
    render(<POBudgetPreview budget={budget} prEstimate={0} poTotal={70000} />)
    const after = screen.getByTestId('po-budget-remaining-after')
    expect(after.textContent).toContain(formatCurrency(-10000))
    expect(after.className).toMatch(/text-destructive/)
  })

  it('coerces string money inputs before arithmetic', () => {
    // prEstimate/poTotal passed as strings (decimal-from-API shape) must still compute remainingAfter = 55000
    render(
      <POBudgetPreview
        budget={budget}
        prEstimate={'20000' as unknown as number}
        poTotal={'25000' as unknown as number}
      />,
    )
    const after = screen.getByTestId('po-budget-remaining-after')
    expect(after.textContent).toContain(formatCurrency(55000))
  })
})
