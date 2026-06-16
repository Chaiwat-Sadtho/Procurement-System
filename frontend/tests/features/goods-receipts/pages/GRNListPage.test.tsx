import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { GoodsReceiptListItem, GRNListResponse } from '@/features/goods-receipts/types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/features/goods-receipts/hooks/useGoodsReceipts', () => ({ useGoodsReceipts: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/goods-receipts/hooks/useReceivablePOs', () => ({ useReceivablePOs: vi.fn() }))
// keep this page test focused on the page, not filter internals (mirror POListPage test).
// mockFilter.values lets a test drive a specific (non-'all') submission so the page's
// value->queryParam mapping (string id -> Number, 'all' -> undefined) is actually exercised.
const mockFilter = vi.hoisted(() => ({
  values: { status: 'all', poId: 'all' } as { status: string; poId: string },
}))
vi.mock('@/features/goods-receipts/components/GRNListFilterForm', () => ({
  GRNListFilterForm: ({
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

import { useGoodsReceipts } from '@/features/goods-receipts/hooks/useGoodsReceipts'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useReceivablePOs } from '@/features/goods-receipts/hooks/useReceivablePOs'
import { GRNListPage } from '@/features/goods-receipts/pages/GRNListPage'

const mockGrn: GoodsReceiptListItem = {
  id: 1,
  grnNumber: 'GRN-2026-0001',
  poId: 5,
  purchaseOrder: { id: 5, poNumber: 'PO-2026-0005' },
  receivedBy: 9,
  receivedDate: '2026-06-01',
  status: 'complete',
  notes: null,
  items: [{ id: 11 }, { id: 12 }],
  createdAt: '2026-06-01T00:00:00Z',
}

function listData(
  data: GoodsReceiptListItem[],
  meta: Partial<GRNListResponse['meta']> = {},
): GRNListResponse {
  return { data, meta: { page: 1, limit: 5, total: data.length, totalPages: 1, ...meta } }
}

function setup({
  data,
  isLoading = false,
  isError = false,
}: {
  data?: GRNListResponse
  isLoading?: boolean
  isError?: boolean
}) {
  const refetch = vi.fn()
  vi.mocked(useGoodsReceipts).mockReturnValue({
    data,
    isLoading,
    isError,
    refetch,
  } as unknown as ReturnType<typeof useGoodsReceipts>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<
    typeof useCurrentUser
  >)
  vi.mocked(useReceivablePOs).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useReceivablePOs
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
      <GRNListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { ...utils, locRef }
}

const poUser = { id: 9, role: 'procurement_officer' } as User
const managerUser = { id: 2, role: 'manager' } as User

describe('GRNListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFilter.values = { status: 'all', poId: 'all' }
  })

  it('is search-first: query disabled and a prompt is shown before searching', () => {
    setup({ data: undefined })
    renderPage()
    expect(vi.mocked(useGoodsReceipts).mock.calls[0][1]).toEqual({ enabled: false })
    expect(screen.getByText(/กดค้นหาเพื่อแสดงการรับของ/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('enables the query and shows the table after pressing ค้นหา', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(vi.mocked(useGoodsReceipts).mock.calls.at(-1)![1]).toEqual({ enabled: true })
    expect(screen.getByText('GRN-2026-0001')).toBeInTheDocument()
  })

  it('returns to the prompt after ล้าง', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/กดค้นหาเพื่อแสดงการรับของ/)).toBeInTheDocument()
  })

  it('shows the loading skeleton', async () => {
    setup({ data: undefined, isLoading: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const loading = screen.getByTestId('grn-list-loading')
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

  it('renders the table (table-fixed + bg-table-header) with GRN fields + status badge + item count', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('GRN-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('PO-2026-0005')).toBeInTheDocument()
    expect(screen.getByText('รับครบถ้วน')).toBeInTheDocument() // GrnStatusBadge complete
    // scope the item-count assertion to the row so it can never pick up a stray '2'
    const grnRow = screen.getByText('GRN-2026-0001').closest('tr')!
    expect(within(grnRow).getByText('2')).toBeInTheDocument() // items.length
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('thead')).toHaveClass('bg-table-header')
  })

  it('navigates when a non-link cell of the row is clicked (whole-row mouse target)', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    // click a NON-link cell (PO number); the GRN-number cell is the link, which stops propagation
    await userEvent.click(screen.getByText('PO-2026-0005'))
    expect(mockNavigate).toHaveBeenCalledWith('/goods-receipts/1')
  })

  it('exposes the GRN number as a real link, and clicking it does not double-fire the row onClick', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const link = screen.getByRole('link', { name: 'GRN-2026-0001' })
    expect(link).toHaveAttribute('href', '/goods-receipts/1')
    // stopPropagation guard: the link handles nav; the row onClick must not also fire
    await userEvent.click(link)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows the error box with a retry button that calls refetch', async () => {
    const { refetch } = setup({ data: undefined, isError: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('โหลดข้อมูลการรับของไม่สำเร็จ')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดข้อมูลการรับของไม่สำเร็จ')
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('shows the create button for a procurement officer and navigates to new', async () => {
    setup({ data: listData([mockGrn]) })
    vi.mocked(useCurrentUser).mockReturnValue({ data: poUser } as ReturnType<typeof useCurrentUser>)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'บันทึกการรับของ' }))
    expect(mockNavigate).toHaveBeenCalledWith('/goods-receipts/new')
  })

  it('hides the create button for a manager', () => {
    setup({ data: listData([mockGrn]) })
    vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<
      typeof useCurrentUser
    >)
    renderPage()
    expect(screen.queryByRole('button', { name: 'บันทึกการรับของ' })).not.toBeInTheDocument()
  })

  it('keeps the running number continuous across pages (uses meta.page)', async () => {
    setup({
      data: listData([mockGrn, { ...mockGrn, id: 2, grnNumber: 'GRN-2026-0002' }], {
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
    setup({ data: listData([mockGrn], { total: 1, totalPages: 1 }) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByLabelText('จำนวนแถวต่อหน้า')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ก่อนหน้า/i })).not.toBeInTheDocument()
  })

  it('resets to page 1 on filter submit (starts on page 2 so the reset is observable)', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage(['/?page=2&limit=5'])
    // sanity: the page genuinely started on 2 — otherwise asserting a reset to 1 is vacuous
    expect(vi.mocked(useGoodsReceipts).mock.calls[0][0]).toEqual(
      expect.objectContaining({ page: 2 }),
    )
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const lastCall = vi.mocked(useGoodsReceipts).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ page: 1 }))
  })

  it('maps non-all filter values into the query (poId -> number, status passthrough)', async () => {
    setup({ data: listData([mockGrn]) })
    mockFilter.values = { status: 'complete', poId: '5' }
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const lastCall = vi.mocked(useGoodsReceipts).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ status: 'complete', poId: 5, page: 1 }))
  })

  it('clears filters back to undefined when the clear button is pressed', async () => {
    setup({ data: listData([mockGrn]) })
    mockFilter.values = { status: 'complete', poId: '5' }
    renderPage()
    // apply a real filter first so the reset is observable (non-vacuous)
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(vi.mocked(useGoodsReceipts).mock.calls.at(-1)![0]).toEqual(
      expect.objectContaining({ status: 'complete', poId: 5 }),
    )
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    const afterClear = vi.mocked(useGoodsReceipts).mock.calls.at(-1)!
    expect(afterClear[0]?.status).toBeUndefined()
    expect(afterClear[0]?.poId).toBeUndefined()
    expect(afterClear[0]).toEqual(expect.objectContaining({ page: 1 }))
  })

  // --- filters in URL ---

  it('restores filters from the URL and auto-searches when q is present', () => {
    setup({ data: listData([mockGrn]) })
    renderPage(['/?q=1&status=complete'])
    expect(vi.mocked(useGoodsReceipts).mock.calls[0][1]).toEqual({ enabled: true })
    expect(vi.mocked(useGoodsReceipts).mock.calls[0][0]!.status).toBe('complete')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('parses URL filters even without q but stays on the prompt (parse independent of q)', () => {
    setup({ data: listData([mockGrn]) })
    renderPage(['/?status=complete'])
    expect(vi.mocked(useGoodsReceipts).mock.calls[0][1]).toEqual({ enabled: false })
    expect(vi.mocked(useGoodsReceipts).mock.calls[0][0]!.status).toBe('complete')
    expect(screen.getByText(/กดค้นหาเพื่อแสดงการรับของ/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('writes q + status + page=1 to the URL on submit', async () => {
    setup({ data: listData([mockGrn]) })
    mockFilter.values = { status: 'complete', poId: 'all' }
    const { locRef } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const params = new URLSearchParams(locRef.current)
    expect(params.get('q')).toBe('1')
    expect(params.get('status')).toBe('complete')
    expect(params.get('page')).toBe('1')
  })

  it('removes q + filters from the URL (keeps page=1) on clear', async () => {
    setup({ data: listData([mockGrn]) })
    const { locRef } = renderPage(['/?q=1&status=complete'])
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    const params = new URLSearchParams(locRef.current)
    expect(params.has('q')).toBe(false)
    expect(params.has('status')).toBe(false)
    expect(params.get('page')).toBe('1')
    expect(screen.getByText(/กดค้นหาเพื่อแสดงการรับของ/)).toBeInTheDocument()
  })
})
