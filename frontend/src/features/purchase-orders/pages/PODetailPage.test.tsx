import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { PurchaseOrder } from '../types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/usePurchaseOrder', () => ({ usePurchaseOrder: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// PORatingSection มี test ของตัวเอง (D2) + เรียก useQuery/useMutation จริง (harness ไม่มี QueryClientProvider)
// → mock ทั้งตัว แยก concern; assert ว่าถูก render ด้วย po ที่ถูกต้อง
vi.mock('../components/PORatingSection', () => ({
  PORatingSection: ({ po }: { po: { id: number } }) => (
    <div data-testid="po-rating-section">rating:{po.id}</div>
  ),
}))

import { usePurchaseOrder } from '../hooks/usePurchaseOrder'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { toast } from 'sonner'
import { PODetailPage } from './PODetailPage'

const mockPO: PurchaseOrder = {
  id: 1,
  poNumber: 'PO-2026-0001',
  prId: 5,
  purchaseRequest: { id: 5, prNumber: 'PR-2026-0005' },
  vendorId: 2,
  vendor: { id: 2, name: 'ACME Corp' },
  createdBy: 9,
  createdByUser: { id: 9, fullName: 'Officer A' },
  status: 'draft',
  totalAmount: '1500.00',
  expectedDeliveryDate: '2026-07-01',
  actualDeliveryDate: null,
  notes: null,
  items: [
    {
      id: 101,
      poId: 1,
      prItemId: 201,
      itemName: 'A4 Paper',
      quantity: '10',
      unit: 'reams',
      unitPrice: '150.00',
      totalPrice: '1500.00',
      receivedQuantity: '0',
    },
  ],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
} as unknown as PurchaseOrder

const poUser: User = {
  id: 9,
  email: 'o@x.com',
  firstName: 'O',
  middleName: null,
  lastName: 'A',
  fullName: 'Officer A',
  role: 'procurement_officer',
  isActive: true,
  departmentId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

type HookReturn = ReturnType<typeof usePurchaseOrder>

function mockHook(overrides: Partial<Record<string, unknown>> = {}) {
  const sendMutation = { mutate: vi.fn(), isPending: false }
  const acknowledgeMutation = { mutate: vi.fn(), isPending: false }
  const cancelMutation = { mutate: vi.fn(), isPending: false }
  const grnsQuery = { data: [], isLoading: false }
  vi.mocked(usePurchaseOrder).mockReturnValue({
    data: mockPO,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    sendMutation,
    acknowledgeMutation,
    cancelMutation,
    grnsQuery,
    ...overrides,
  } as unknown as HookReturn)
  return { sendMutation, acknowledgeMutation, cancelMutation }
}

function setUser(user: User | undefined = poUser) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/purchase-orders/${id}`]}>
      <Routes>
        <Route path="/purchase-orders/:id" element={<PODetailPage />} />
        <Route path="/purchase-orders" element={<div>LIST PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PODetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading skeleton while fetching', () => {
    mockHook({ data: undefined, isLoading: true })
    setUser()
    renderPage()
    expect(screen.getByTestId('po-detail-loading')).toBeInTheDocument()
  })

  it('shows error alert with a back link when isError', () => {
    mockHook({ data: undefined, isError: true })
    setUser()
    renderPage()
    expect(screen.getByText(/ไม่พบใบสั่งซื้อนี้/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับไปรายการ' })).toBeInTheDocument()
  })

  it('shows error alert for an invalid id', () => {
    mockHook({ data: undefined })
    setUser()
    renderPage('abc')
    expect(screen.getByText(/ไม่พบใบสั่งซื้อนี้/)).toBeInTheDocument()
  })

  it('renders header, items and PO actions on success', () => {
    mockHook()
    setUser()
    renderPage()
    expect(screen.getByText('PO-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ส่ง' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
  })

  it('send flow: clicking send opens confirm then calls sendMutation', async () => {
    const { sendMutation } = mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ส่ง' }))
    expect(screen.getByText('ยืนยันการส่งใบสั่งซื้อ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันส่ง' }))
    expect(sendMutation.mutate).toHaveBeenCalledWith(undefined, expect.anything())
  })

  it('shows a success toast when send succeeds', async () => {
    const { sendMutation } = mockHook()
    sendMutation.mutate.mockImplementation((_v: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ส่ง' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันส่ง' }))
    expect(toast.success).toHaveBeenCalledWith('ส่งใบสั่งซื้อแล้ว')
  })

  it('acknowledge flow on a sent PO calls acknowledgeMutation', async () => {
    const { acknowledgeMutation } = mockHook({ data: { ...mockPO, status: 'sent' } })
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'รับทราบ' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันรับทราบ' }))
    expect(acknowledgeMutation.mutate).toHaveBeenCalledWith(undefined, expect.anything())
  })

  it('cancel flow calls cancelMutation', async () => {
    const { cancelMutation } = mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิก' }))
    expect(cancelMutation.mutate).toHaveBeenCalledWith(undefined, expect.anything())
  })

  it('shows an error toast when a transition fails', async () => {
    const { sendMutation } = mockHook()
    sendMutation.mutate.mockImplementation((_v: unknown, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new Error('x')),
    )
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ส่ง' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันส่ง' }))
    expect(toast.error).toHaveBeenCalledWith('เกิดข้อผิดพลาด')
  })

  it('navigates to the edit route when แก้ไข is clicked on a draft', async () => {
    mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-orders/1/edit')
  })

  it('renders the rating section with the PO', async () => {
    mockHook()
    setUser()
    renderPage()
    expect(await screen.findByTestId('po-rating-section')).toHaveTextContent('rating:1')
  })
})
