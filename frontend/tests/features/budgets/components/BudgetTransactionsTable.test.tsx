import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BudgetTransactionsTable } from '@/features/budgets/components/BudgetTransactionsTable'
import type { BudgetTransaction } from '@/features/budgets/types'

const baseTxn: BudgetTransaction = {
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
}

describe('BudgetTransactionsTable', () => {
  it('shows an empty state when there are no transactions', () => {
    render(<BudgetTransactionsTable transactions={[]} />)
    expect(screen.getByText('ยังไม่มี PR ที่อนุมัติใช้งบก้อนนี้')).toBeInTheDocument()
  })

  it('renders the approved badge for a row without a PO', () => {
    render(<BudgetTransactionsTable transactions={[baseTxn]} />)
    expect(screen.getByText('PR-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument()
    expect(screen.getByText('จองแล้ว')).toBeInTheDocument()
  })

  it('renders the PO status badge for a row with a completed PO', () => {
    render(
      <BudgetTransactionsTable
        transactions={[
          { ...baseTxn, poId: 9, poNumber: 'PO-2026-0001', poStatus: 'completed', bucket: 'used' },
        ]}
      />,
    )
    expect(screen.getByText('PO-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('เสร็จสมบูรณ์')).toBeInTheDocument()
    expect(screen.getByText('ใช้จริง')).toBeInTheDocument()
  })
})
