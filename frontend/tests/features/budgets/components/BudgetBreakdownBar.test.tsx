import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BudgetBreakdownBar } from '@/features/budgets/components/BudgetBreakdownBar'

describe('BudgetBreakdownBar', () => {
  it('renders the usage caption and a legend with computed remaining', () => {
    render(<BudgetBreakdownBar total={1000} reserved={200} used={300} usagePercent={50} />)
    expect(screen.getByText('ใช้ไปแล้ว 50% ของงบ')).toBeInTheDocument()
    // remaining = 1000 - 200 - 300 = 500 → shown in the legend
    expect(screen.getByText('คงเหลือ')).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })
})
