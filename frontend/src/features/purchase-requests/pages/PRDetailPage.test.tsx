import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { PurchaseRequest } from '../types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/usePurchaseRequest', () => ({ usePurchaseRequest: vi.fn() }))
vi.mock('../hooks/usePRMutations', () => ({ usePRMutations: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { usePurchaseRequest } from '../hooks/usePurchaseRequest'
import { usePRMutations } from '../hooks/usePRMutations'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { toast } from 'sonner'
import { PRDetailPage } from './PRDetailPage'

const mockPR: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2026-0001',
  title: 'Office Supplies',
  status: 'submitted',
  totalEstimatedAmount: 1500,
  quarter: 2,
  requiredDate: '2026-03-01',
  requesterId: 10,
  requester: { id: 10, fullName: 'Employee A', email: 'a@x.com' },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: null,
  approver: null,
  approvedAt: null,
  rejectReason: null,
  items: [
    {
      id: 101,
      prId: 1,
      itemName: 'A4 Paper',
      description: null,
      quantity: 10,
      unit: 'reams',
      estimatedUnitPrice: 150,
      estimatedTotalPrice: 1500,
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const managerUser: User = {
  id: 99,
  email: 'm@x.com',
  firstName: 'M',
  middleName: null,
  lastName: 'gr',
  fullName: 'Manager',
  role: 'manager',
  isActive: true,
  departmentId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

type HookReturn = ReturnType<typeof usePurchaseRequest>

function mockHook(overrides: Partial<Record<string, unknown>> = {}) {
  const submitMutation = { mutate: vi.fn(), isPending: false }
  const approveMutation = { mutate: vi.fn(), isPending: false }
  const rejectMutation = { mutate: vi.fn(), isPending: false }
  vi.mocked(usePurchaseRequest).mockReturnValue({
    data: mockPR,
    isLoading: false,
    isError: false,
    submitMutation,
    approveMutation,
    rejectMutation,
    ...overrides,
  } as unknown as HookReturn)
  return { submitMutation, approveMutation, rejectMutation }
}

function setMutations() {
  const deleteMutation = { mutate: vi.fn(), isPending: false }
  vi.mocked(usePRMutations).mockReturnValue({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
    submitMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteMutation,
  } as unknown as ReturnType<typeof usePRMutations>)
  return { deleteMutation }
}

function setUser(user: User | undefined = managerUser) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/purchase-requests/${id}`]}>
      <Routes>
        <Route path="/purchase-requests/:id" element={<PRDetailPage />} />
        <Route path="/purchase-requests" element={<div>LIST PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PRDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMutations()
  })

  it('shows loading skeleton while fetching', () => {
    mockHook({ data: undefined, isLoading: true })
    setUser()
    renderPage()
    expect(screen.getByTestId('pr-detail-loading')).toBeInTheDocument()
  })

  it('shows error alert with a back link when isError', () => {
    mockHook({ data: undefined, isError: true })
    setUser()
    renderPage()
    expect(screen.getByText(/ไม่พบใบขอซื้อนี้/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับไปรายการ' })).toBeInTheDocument()
  })

  it('shows error alert for an invalid id', () => {
    mockHook({ data: undefined })
    setUser()
    renderPage('abc')
    expect(screen.getByText(/ไม่พบใบขอซื้อนี้/)).toBeInTheDocument()
  })

  it('renders header, items and manager actions on success', () => {
    mockHook()
    setUser()
    renderPage()
    expect(screen.getByText('PR-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'อนุมัติ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ปฏิเสธ' })).toBeInTheDocument()
  })

  it('approve flow: clicking approve opens confirm then calls approveMutation', async () => {
    const { approveMutation } = mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'อนุมัติ' }))
    expect(screen.getByText('ยืนยันการอนุมัติ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันอนุมัติ' }))
    expect(approveMutation.mutate).toHaveBeenCalledWith(undefined, expect.anything())
  })

  it('shows a success toast when approve succeeds', async () => {
    const { approveMutation } = mockHook()
    approveMutation.mutate.mockImplementation((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'อนุมัติ' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันอนุมัติ' }))
    expect(toast.success).toHaveBeenCalledWith('อนุมัติคำขอซื้อแล้ว')
  })

  it('reject flow: opens reason dialog and calls rejectMutation with the reason', async () => {
    const { rejectMutation } = mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ปฏิเสธ' }))
    await userEvent.type(screen.getByLabelText('เหตุผล'), 'งบไม่พอ')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันปฏิเสธ' }))
    expect(rejectMutation.mutate).toHaveBeenCalledWith('งบไม่พอ', expect.anything())
  })

  it('shows an error toast when a mutation fails', async () => {
    const { approveMutation } = mockHook()
    approveMutation.mutate.mockImplementation((_vars: unknown, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new Error('x')),
    )
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'อนุมัติ' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันอนุมัติ' }))
    expect(toast.error).toHaveBeenCalledWith('เกิดข้อผิดพลาด')
  })

  it('employee owner of a draft PR sees the submit button', () => {
    mockHook({ data: { ...mockPR, status: 'draft' } })
    setUser({ ...managerUser, id: 10, role: 'employee' })
    renderPage()
    expect(screen.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeInTheDocument()
  })

  it('navigates to the edit route when แก้ไข is clicked', async () => {
    mockHook({ data: { ...mockPR, id: 3, status: 'draft', requesterId: 10 } })
    setMutations()
    setUser({ ...managerUser, id: 10, role: 'employee' })
    renderPage('3')
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/3/edit')
  })

  it('deletes the draft after confirming and navigates to the list', async () => {
    mockHook({ data: { ...mockPR, id: 3, status: 'draft', requesterId: 10 } })
    const { deleteMutation } = setMutations()
    deleteMutation.mutate.mockImplementation((_id: number, opts: { onSuccess: () => void }) => opts.onSuccess())
    setUser({ ...managerUser, id: 10, role: 'employee' })
    renderPage('3')
    await userEvent.click(screen.getByRole('button', { name: 'ลบร่าง' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }))
    expect(deleteMutation.mutate).toHaveBeenCalledWith(3, expect.anything())
    expect(toast.success).toHaveBeenCalledWith('ลบใบร่างแล้ว')
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests')
  })
})
