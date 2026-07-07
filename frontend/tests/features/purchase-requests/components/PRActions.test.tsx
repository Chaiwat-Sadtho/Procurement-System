import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/shared/types'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import { PRActions } from '@/features/purchase-requests/components/PRActions'

const basePR: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2026-0001',
  title: 'Office Supplies',
  status: 'draft',
  totalEstimatedAmount: '1000',
  quarter: null,
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

const baseUser: User = {
  id: 10,
  email: 'o@x.com',
  firstName: 'O',
  middleName: null,
  lastName: 'wner',
  fullName: 'Owner',
  role: 'employee',
  isActive: true,
  departmentId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const noop = () => {}

function renderActions(
  pr: Partial<PurchaseRequest>,
  user: Partial<User>,
  handlers: Partial<{
    onSubmit: () => void
    onApprove: () => void
    onReject: () => void
    onEdit: () => void
    onDelete: () => void
  }> = {},
) {
  return render(
    <PRActions
      pr={{ ...basePR, ...pr }}
      user={{ ...baseUser, ...user }}
      onSubmit={handlers.onSubmit ?? noop}
      onApprove={handlers.onApprove ?? noop}
      onReject={handlers.onReject ?? noop}
      onEdit={handlers.onEdit ?? noop}
      onDelete={handlers.onDelete ?? noop}
    />,
  )
}

describe('PRActions gating', () => {
  it('employee owner + draft → only submit button', () => {
    renderActions({ status: 'draft', requesterId: 10 }, { role: 'employee', id: 10 })
    expect(screen.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'อนุมัติ' })).not.toBeInTheDocument()
  })

  it('employee owner + submitted → no buttons', () => {
    const { container } = renderActions(
      { status: 'submitted', requesterId: 10 },
      { role: 'employee', id: 10 },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('employee non-owner + draft → no buttons', () => {
    const { container } = renderActions(
      { status: 'draft', requesterId: 10 },
      { role: 'employee', id: 11 },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('manager + submitted → approve + reject', () => {
    renderActions({ status: 'submitted' }, { role: 'manager', id: 99 })
    expect(screen.getByRole('button', { name: 'อนุมัติ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ปฏิเสธ' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ส่งขออนุมัติ' })).not.toBeInTheDocument()
  })

  it('manager + draft → no buttons', () => {
    const { container } = renderActions({ status: 'draft' }, { role: 'manager', id: 99 })
    expect(container).toBeEmptyDOMElement()
  })

  it('manager + approved → no buttons', () => {
    const { container } = renderActions({ status: 'approved' }, { role: 'manager', id: 99 })
    expect(container).toBeEmptyDOMElement()
  })

  it('procurement_officer + submitted → no buttons (view only)', () => {
    const { container } = renderActions(
      { status: 'submitted' },
      { role: 'procurement_officer', id: 99 },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('fires onSubmit when submit clicked', async () => {
    const onSubmit = vi.fn()
    renderActions({ status: 'draft', requesterId: 10 }, { role: 'employee', id: 10 }, { onSubmit })
    await userEvent.click(screen.getByRole('button', { name: 'ส่งขออนุมัติ' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('fires onApprove / onReject when manager clicks', async () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    renderActions({ status: 'submitted' }, { role: 'manager', id: 99 }, { onApprove, onReject })
    await userEvent.click(screen.getByRole('button', { name: 'อนุมัติ' }))
    await userEvent.click(screen.getByRole('button', { name: 'ปฏิเสธ' }))
    expect(onApprove).toHaveBeenCalledOnce()
    expect(onReject).toHaveBeenCalledOnce()
  })

  it('shows แก้ไข and ลบร่าง for the owner of a draft and fires handlers', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderActions(
      { status: 'draft', requesterId: 10 },
      { role: 'employee', id: 10 },
      { onEdit, onDelete },
    )
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
    await userEvent.click(screen.getByRole('button', { name: 'ลบร่าง' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('hides แก้ไข/ลบร่าง for a non-draft PR', () => {
    renderActions({ status: 'submitted', requesterId: 10 }, { role: 'employee', id: 10 })
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ลบร่าง' })).not.toBeInTheDocument()
  })

  it('hides แก้ไข/ลบร่าง for a non-owner', () => {
    renderActions({ status: 'draft', requesterId: 10 }, { role: 'employee', id: 99 })
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
  })
})
