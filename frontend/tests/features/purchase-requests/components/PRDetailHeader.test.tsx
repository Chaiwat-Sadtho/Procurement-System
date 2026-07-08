import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/utils'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import { PRDetailHeader } from '@/features/purchase-requests/components/PRDetailHeader'

const basePR: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2026-0001',
  title: 'Office Supplies',
  status: 'draft',
  totalEstimatedAmount: '1000',
  quarter: 2,
  requiredDate: '2026-02-01',
  requesterId: 10,
  requester: { id: 10, fullName: 'Owner', email: 'o@x.com' },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: null,
  approver: null,
  approvedAt: null,
  rejectReason: null,
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderHeader(pr: Partial<PurchaseRequest> = {}, actions?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <PRDetailHeader pr={{ ...basePR, ...pr }} actions={actions} />
    </MemoryRouter>,
  )
}

describe('PRDetailHeader', () => {
  it('renders prNumber, title and status badge', () => {
    renderHeader()
    expect(screen.getByText('PR-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('Office Supplies')).toBeInTheDocument()
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
  })

  it('renders meta fields including requester, department and amount', () => {
    renderHeader()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('IT')).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(1000))).toBeInTheDocument()
  })

  it('shows reject reason alert when status is rejected', () => {
    renderHeader({ status: 'rejected', rejectReason: 'งบไม่พอ' })
    expect(screen.getByText('เหตุผลที่ปฏิเสธ')).toBeInTheDocument()
    expect(screen.getByText('งบไม่พอ')).toBeInTheDocument()
  })

  it('does not show reject alert when not rejected', () => {
    renderHeader({ status: 'submitted' })
    expect(screen.queryByText('เหตุผลที่ปฏิเสธ')).not.toBeInTheDocument()
  })

  it('shows approver line when status is approved', () => {
    renderHeader({
      status: 'approved',
      approver: { id: 5, fullName: 'Boss', email: 'b@x.com' },
      approvedAt: '2026-01-05T00:00:00Z',
    })
    expect(screen.getByText(/อนุมัติโดย Boss/)).toBeInTheDocument()
  })

  it('renders the actions slot', () => {
    renderHeader({}, <button>SLOT-ACTION</button>)
    expect(screen.getByRole('button', { name: 'SLOT-ACTION' })).toBeInTheDocument()
  })
})
