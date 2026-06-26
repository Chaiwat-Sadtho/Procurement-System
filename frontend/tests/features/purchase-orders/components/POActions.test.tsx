import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/shared/types'
import type { PurchaseOrder } from '@/features/purchase-orders/types'
import { POActions } from '@/features/purchase-orders/components/POActions'

const basePO: PurchaseOrder = {
  id: 1,
  poNumber: 'PO-2026-0001',
  prId: 5,
  purchaseRequest: {
    id: 5,
    prNumber: 'PR-2026-0009',
    quarter: 1,
    fiscalYear: 2026,
    departmentId: 1,
    department: { id: 1, name: 'IT' },
    totalEstimatedAmount: '1000',
  },
  vendorId: 7,
  vendor: { id: 7, name: 'Acme Co', isBlacklisted: false },
  createdBy: 10,
  createdByUser: { id: 10, fullName: 'Officer One', email: 'o@x.com' },
  status: 'draft',
  totalAmount: '1800',
  expectedDeliveryDate: '2026-03-01',
  actualDeliveryDate: null,
  notes: null,
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const officer: User = {
  id: 10,
  email: 'o@x.com',
  firstName: 'Officer',
  middleName: null,
  lastName: 'One',
  fullName: 'Officer One',
  role: 'procurement_officer',
  isActive: true,
  departmentId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const noop = () => {}

function renderActions(
  po: Partial<PurchaseOrder>,
  user: Partial<User> = {},
  handlers: Partial<{
    onEdit: () => void
    onSend: () => void
    onAcknowledge: () => void
    onCancel: () => void
  }> = {},
) {
  return render(
    <POActions
      po={{ ...basePO, ...po }}
      user={{ ...officer, ...user }}
      onEdit={handlers.onEdit ?? noop}
      onSend={handlers.onSend ?? noop}
      onAcknowledge={handlers.onAcknowledge ?? noop}
      onCancel={handlers.onCancel ?? noop}
    />,
  )
}

describe('POActions gating', () => {
  it('hides everything for a non-officer role', () => {
    const { container } = renderActions({ status: 'draft' }, { role: 'manager' })
    expect(container).toBeEmptyDOMElement()
  })

  it('draft → แก้ไข, ส่ง, ยกเลิก', () => {
    renderActions({ status: 'draft' })
    expect(screen.getByRole('button', { name: 'แก้ไข' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ส่ง' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
  })

  it('sent → รับทราบ + ยกเลิก, no แก้ไข/ส่ง', () => {
    renderActions({ status: 'sent' })
    expect(screen.getByRole('button', { name: 'รับทราบ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ส่ง' })).not.toBeInTheDocument()
  })

  it('acknowledged → only ยกเลิก', () => {
    renderActions({ status: 'acknowledged' })
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'รับทราบ' })).not.toBeInTheDocument()
  })

  it('partially_received → only ยกเลิก', () => {
    renderActions({ status: 'partially_received' })
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
  })

  it('completed → no buttons', () => {
    const { container } = renderActions({ status: 'completed' })
    expect(container).toBeEmptyDOMElement()
  })

  it('cancelled → no buttons', () => {
    const { container } = renderActions({ status: 'cancelled' })
    expect(container).toBeEmptyDOMElement()
  })

  it('fires the handlers on click', async () => {
    const onEdit = vi.fn()
    const onSend = vi.fn()
    const onCancel = vi.fn()
    renderActions({ status: 'draft' }, {}, { onEdit, onSend, onCancel })
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
    await userEvent.click(screen.getByRole('button', { name: 'ส่ง' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onSend).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('fires onAcknowledge when รับทราบ is clicked on a sent PO', async () => {
    const onAcknowledge = vi.fn()
    renderActions({ status: 'sent' }, {}, { onAcknowledge })
    await userEvent.click(screen.getByRole('button', { name: 'รับทราบ' }))
    expect(onAcknowledge).toHaveBeenCalledOnce()
  })

  it('lays buttons out on a responsive right-aligned col-grid', () => {
    const { container } = renderActions({ status: 'draft' }) // 3 buttons -> right-align col-start 2,3,4
    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-4')
    expect(container.querySelectorAll('.sm\\:col-start-2').length).toBe(1)
    expect(container.querySelectorAll('.sm\\:col-start-3').length).toBe(1)
    expect(container.querySelectorAll('.sm\\:col-start-4').length).toBe(1)
  })
})
