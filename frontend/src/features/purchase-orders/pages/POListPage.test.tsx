import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PurchaseOrder, POListResponse } from '../types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/usePurchaseOrders', () => ({ usePurchaseOrders: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
// POListFilterForm (slice D) owns its own vendor source; stub it to a minimal inert
// form so this page test stays focused on the page, not the filter internals.
vi.mock('../components/POListFilterForm', () => ({
  POListFilterForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
    <button type="button" onClick={() => onSubmit({ status: 'all', vendorId: 'all' })}>
      ค้นหา
    </button>
  ),
}))

import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { POListPage } from './POListPage'

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
  items: [],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
} as unknown as PurchaseOrder

function listData(
  data: PurchaseOrder[],
  meta: Partial<POListResponse['meta']> = {},
): POListResponse {
  return {
    data,
    meta: { page: 1, limit: 5, total: data.length, totalPages: 1, ...meta },
  }
}

function setup({
  data,
  isLoading = false,
  isError = false,
}: {
  data?: POListResponse
  isLoading?: boolean
  isError?: boolean
}) {
  const refetch = vi.fn()
  vi.mocked(usePurchaseOrders).mockReturnValue({
    data,
    isLoading,
    isError,
    refetch,
  } as unknown as ReturnType<typeof usePurchaseOrders>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
  return { refetch }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <POListPage />
    </MemoryRouter>,
  )
}

const poUser = { id: 9, role: 'procurement_officer' } as User
const managerUser = { id: 2, role: 'manager' } as User

describe('POListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches immediately on mount with enabled=true and page 1, limit 5', () => {
    setup({ data: undefined })
    renderPage()
    const firstCall = vi.mocked(usePurchaseOrders).mock.calls[0]
    expect(firstCall[0]).toEqual(expect.objectContaining({ page: 1, limit: 5 }))
    expect(firstCall[0]?.status).toBeUndefined()
    expect(firstCall[0]?.vendorId).toBeUndefined()
    expect(firstCall[1]).toEqual({ enabled: true })
  })

  it('shows the loading skeleton', () => {
    setup({ data: undefined, isLoading: true })
    renderPage()
    expect(screen.getByTestId('po-list-loading')).toBeInTheDocument()
  })

  it('shows the empty row when data is empty', () => {
    setup({ data: listData([], { total: 0, totalPages: 0 }) })
    renderPage()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
  })

  it('renders the table (table-fixed + bg-table-header) with PO fields', () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    expect(screen.getByText('PO-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('PR-2026-0005')).toBeInTheDocument()
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('thead')).toHaveClass('bg-table-header')
  })

  it('navigates to the detail route when a row is clicked', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByText('PO-2026-0001'))
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-orders/1')
  })

  it('navigates when Enter is pressed on a focused row (keyboard a11y)', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    const row = screen.getByText('PO-2026-0001').closest('tr')!
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-orders/1')
  })

  it('shows the error box with a retry button that calls refetch', async () => {
    const { refetch } = setup({ data: undefined, isError: true })
    renderPage()
    expect(screen.getByText('โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('shows the create button for a procurement officer and navigates to new', async () => {
    setup({ data: listData([mockPO]) })
    vi.mocked(useCurrentUser).mockReturnValue({ data: poUser } as ReturnType<typeof useCurrentUser>)
    renderPage()
    const addBtn = screen.getByRole('button', { name: 'สร้างใบสั่งซื้อ' })
    await userEvent.click(addBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-orders/new')
  })

  it('hides the create button for a manager', () => {
    setup({ data: listData([mockPO]) })
    vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<typeof useCurrentUser>)
    renderPage()
    expect(screen.queryByRole('button', { name: 'สร้างใบสั่งซื้อ' })).not.toBeInTheDocument()
  })

  it('keeps the running number continuous across pages (uses meta.page)', () => {
    setup({
      data: listData([mockPO, { ...mockPO, id: 2, poNumber: 'PO-2026-0002' }], {
        page: 2,
        limit: 20,
        total: 22,
        totalPages: 2,
      }),
    })
    renderPage()
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('shows the footer with PageSizeSelect even when there is only one page', () => {
    setup({ data: listData([mockPO], { total: 1, totalPages: 1 }) })
    renderPage()
    expect(screen.getByLabelText('จำนวนแถวต่อหน้า')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ก่อนหน้า/i })).not.toBeInTheDocument()
  })

  it('refetches on filter submit and keeps page reset to 1', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const lastCall = vi.mocked(usePurchaseOrders).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ page: 1 }))
  })
})
