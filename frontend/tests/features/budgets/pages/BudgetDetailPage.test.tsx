import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BudgetDetailPage } from '@/features/budgets/pages/BudgetDetailPage'
import type { BudgetSummary, BudgetTransaction } from '@/features/budgets/types'

const summary = vi.fn()
const transactions = vi.fn()
const currentUser = vi.fn()

vi.mock('@/features/budgets/hooks/useBudgetSummary', () => ({ useBudgetSummary: () => summary() }))
vi.mock('@/features/budgets/hooks/useBudgetTransactions', () => ({ useBudgetTransactions: () => transactions() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: () => currentUser() }))

const budget: BudgetSummary = {
  id: 5,
  departmentId: 1,
  department: { id: 1, name: 'Engineering' },
  fiscalYear: 2026,
  quarter: null,
  totalAmount: 1000000,
  reservedAmount: 200000,
  usedAmount: 300000,
  remaining: 500000,
  usagePercent: 50,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const txns: BudgetTransaction[] = [
  {
    prId: 1,
    prNumber: 'PR-2026-0001',
    prTitle: 'Laptops',
    requesterName: 'John Doe',
    approvedAt: '2026-03-01T00:00:00.000Z',
    poId: null,
    poNumber: null,
    poStatus: null,
    amount: 10000,
    bucket: 'reserved',
  },
]

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/budgets/${id}`]}>
      <Routes>
        <Route path="/budgets/:id" element={<BudgetDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BudgetDetailPage', () => {
  beforeEach(() => {
    summary.mockReturnValue({ data: budget, isLoading: false, isError: false })
    transactions.mockReturnValue({ data: txns, isLoading: false, isError: false })
    currentUser.mockReturnValue({ data: { role: 'procurement_officer', departmentId: 1 } })
  })

  it('renders the summary cards and the money trail', () => {
    renderAt('5')
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('ใช้ไปแล้ว 50% ของงบ')).toBeInTheDocument()
    expect(screen.getByText('PR-2026-0001')).toBeInTheDocument()
  })

  it('shows the edit button for a procurement officer', () => {
    renderAt('5')
    expect(screen.getByRole('button', { name: 'แก้ไขงบประมาณ' })).toBeInTheDocument()
  })

  it('hides the edit button for a manager', () => {
    currentUser.mockReturnValue({ data: { role: 'manager', departmentId: 1 } })
    renderAt('5')
    expect(screen.queryByRole('button', { name: 'แก้ไขงบประมาณ' })).not.toBeInTheDocument()
  })

  it('stacks the summary cards below sm so a long currency value cannot overflow its card', () => {
    renderAt('5')
    const grid = screen.getByText('งบทั้งหมด').closest('div.grid')
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4')
  })

  it('shows a not-found notice when the summary errors', () => {
    summary.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderAt('5')
    expect(screen.getByText('ไม่พบงบประมาณนี้ หรือคุณไม่มีสิทธิ์เข้าถึง')).toBeInTheDocument()
  })
})
