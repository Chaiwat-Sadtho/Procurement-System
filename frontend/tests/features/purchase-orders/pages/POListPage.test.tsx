import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { PurchaseOrder, POListResponse } from '@/features/purchase-orders/types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/features/purchase-orders/hooks/usePurchaseOrders', () => ({ usePurchaseOrders: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
const mockFilter = vi.hoisted(() => ({
  values: { status: 'all', vendorId: 'all' } as { status: string; vendorId: string },
}))
// POListFilterForm (slice D) owns its own vendor source; stub it to a minimal inert
// form so this page test stays focused on the page, not the filter internals.
vi.mock('@/features/purchase-orders/components/POListFilterForm', () => ({
  POListFilterForm: ({
    onSubmit,
    onClear,
  }: {
    onSubmit: (v: unknown) => void
    onClear?: () => void
  }) => (
    <div>
      <button type="button" onClick={() => onSubmit(mockFilter.values)}>
        ค้นหา
      </button>
      <button type="button" onClick={() => onClear?.()}>
        ล้างตัวกรอง
      </button>
    </div>
  ),
}))
vi.mock('@/features/vendors/hooks/useVendors', () => ({ useVendors: vi.fn() }))

import { usePurchaseOrders } from '@/features/purchase-orders/hooks/usePurchaseOrders'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useVendors } from '@/features/vendors/hooks/useVendors'
import { POListPage } from '@/features/purchase-orders/pages/POListPage'

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
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<
    typeof useCurrentUser
  >)
  vi.mocked(useVendors).mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useVendors
  >)
  return { refetch }
}

function renderPage(initialEntries: string[] = ['/']) {
  const locRef = { current: '' }
  function LocationProbe() {
    const loc = useLocation()
    useEffect(() => {
      locRef.current = loc.search
    }, [loc])
    return null
  }
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <POListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { ...utils, locRef }
}

const poUser = { id: 9, role: 'procurement_officer' } as User
const managerUser = { id: 2, role: 'manager' } as User

describe('POListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFilter.values = { status: 'all', vendorId: 'all' }
  })

  it('is search-first: query disabled and a prompt is shown before searching', () => {
    setup({ data: undefined })
    renderPage()
    expect(vi.mocked(usePurchaseOrders).mock.calls[0][1]).toEqual({ enabled: false })
    expect(screen.getByText(/กดค้นหาเพื่อแสดงใบสั่งซื้อ/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('enables the query and shows the table after pressing ค้นหา', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(vi.mocked(usePurchaseOrders).mock.calls.at(-1)![1]).toEqual({ enabled: true })
    expect(screen.getByText('PO-2026-0001')).toBeInTheDocument()
  })

  it('returns to the prompt after ล้าง (even when searched with default filters)', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/กดค้นหาเพื่อแสดงใบสั่งซื้อ/)).toBeInTheDocument()
  })

  it('shows the loading skeleton', async () => {
    setup({ data: undefined, isLoading: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const loading = screen.getByTestId('po-list-loading')
    expect(loading).toBeInTheDocument()
    expect(loading).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the empty row when data is empty', async () => {
    setup({ data: listData([], { total: 0, totalPages: 0 }) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toHaveAttribute('role', 'status')
  })

  it('renders the table (table-fixed + bg-table-header) with PO fields', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('PO-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('PR-2026-0005')).toBeInTheDocument()
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('thead')).toHaveClass('bg-table-header')
  })

  it('navigates when a non-link cell of the row is clicked (whole-row mouse target)', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    // click a NON-link cell (vendor name); the id cell is the link, which stops propagation
    await userEvent.click(screen.getByText('ACME Corp'))
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-orders/1')
  })

  it('exposes the id as a real link, and clicking it does not double-fire the row onClick', async () => {
    setup({ data: listData([mockPO]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const link = screen.getByRole('link', { name: 'PO-2026-0001' })
    expect(link).toHaveAttribute('href', '/purchase-orders/1')
    // stopPropagation guard: the link handles nav; the row onClick must not also fire
    await userEvent.click(link)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows the error box with a retry button that calls refetch', async () => {
    const { refetch } = setup({ data: undefined, isError: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ')
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
    vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<
      typeof useCurrentUser
    >)
    renderPage()
    expect(screen.queryByRole('button', { name: 'สร้างใบสั่งซื้อ' })).not.toBeInTheDocument()
  })

  it('keeps the running number continuous across pages (uses meta.page)', async () => {
    setup({
      data: listData([mockPO, { ...mockPO, id: 2, poNumber: 'PO-2026-0002' }], {
        page: 2,
        limit: 20,
        total: 22,
        totalPages: 2,
      }),
    })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('shows the footer with PageSizeSelect even when there is only one page', async () => {
    setup({ data: listData([mockPO], { total: 1, totalPages: 1 }) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
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

  // --- filters in URL ---

  it('restores filters from the URL and auto-searches when q is present', () => {
    setup({ data: listData([mockPO]) })
    renderPage(['/?q=1&status=sent'])
    expect(vi.mocked(usePurchaseOrders).mock.calls[0][1]).toEqual({ enabled: true })
    expect(vi.mocked(usePurchaseOrders).mock.calls[0][0]!.status).toBe('sent')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('parses URL filters even without q but stays on the prompt (parse independent of q)', () => {
    setup({ data: listData([mockPO]) })
    renderPage(['/?status=sent'])
    expect(vi.mocked(usePurchaseOrders).mock.calls[0][1]).toEqual({ enabled: false })
    expect(vi.mocked(usePurchaseOrders).mock.calls[0][0]!.status).toBe('sent')
    expect(screen.getByText(/กดค้นหาเพื่อแสดงใบสั่งซื้อ/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('writes q + status + page=1 to the URL on submit', async () => {
    setup({ data: listData([mockPO]) })
    mockFilter.values = { status: 'sent', vendorId: 'all' }
    const { locRef } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const params = new URLSearchParams(locRef.current)
    expect(params.get('q')).toBe('1')
    expect(params.get('status')).toBe('sent')
    expect(params.get('page')).toBe('1')
  })

  it('removes q + filters from the URL (keeps page=1) on clear', async () => {
    setup({ data: listData([mockPO]) })
    const { locRef } = renderPage(['/?q=1&status=sent'])
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    const params = new URLSearchParams(locRef.current)
    expect(params.has('q')).toBe(false)
    expect(params.has('status')).toBe(false)
    expect(params.get('page')).toBe('1')
    expect(screen.getByText(/กดค้นหาเพื่อแสดงใบสั่งซื้อ/)).toBeInTheDocument()
  })
})
