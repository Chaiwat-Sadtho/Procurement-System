import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { GoodsReceiptListItem, GRNListResponse } from '../types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useGoodsReceipts', () => ({ useGoodsReceipts: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../hooks/useReceivablePOs', () => ({ useReceivablePOs: vi.fn() }))
// keep this page test focused on the page, not filter internals (mirror POListPage test)
vi.mock('../components/GRNListFilterForm', () => ({
  GRNListFilterForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
    <button type="button" onClick={() => onSubmit({ status: 'all', poId: 'all' })}>
      ค้นหา
    </button>
  ),
}))

import { useGoodsReceipts } from '../hooks/useGoodsReceipts'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useReceivablePOs } from '../hooks/useReceivablePOs'
import { GRNListPage } from './GRNListPage'

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
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
  vi.mocked(useReceivablePOs).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useReceivablePOs>)
  return { refetch }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GRNListPage />
    </MemoryRouter>,
  )
}

const poUser = { id: 9, role: 'procurement_officer' } as User
const managerUser = { id: 2, role: 'manager' } as User

describe('GRNListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches immediately on mount with page 1, limit 5', () => {
    setup({ data: undefined })
    renderPage()
    const firstCall = vi.mocked(useGoodsReceipts).mock.calls[0]
    expect(firstCall[0]).toEqual(expect.objectContaining({ page: 1, limit: 5 }))
    expect(firstCall[0]?.status).toBeUndefined()
    expect(firstCall[0]?.poId).toBeUndefined()
    expect(firstCall[1]).toEqual({ enabled: true })
  })

  it('shows the loading skeleton', () => {
    setup({ data: undefined, isLoading: true })
    renderPage()
    expect(screen.getByTestId('grn-list-loading')).toBeInTheDocument()
  })

  it('shows the empty row when data is empty', () => {
    setup({ data: listData([], { total: 0, totalPages: 0 }) })
    renderPage()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
  })

  it('renders the table (table-fixed + bg-table-header) with GRN fields + status badge + item count', () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    expect(screen.getByText('GRN-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('PO-2026-0005')).toBeInTheDocument()
    expect(screen.getByText('รับครบถ้วน')).toBeInTheDocument() // GrnStatusBadge complete
    expect(screen.getByText('2')).toBeInTheDocument() // items.length
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('thead')).toHaveClass('bg-table-header')
  })

  it('navigates to the detail route when a row is clicked', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByText('GRN-2026-0001'))
    expect(mockNavigate).toHaveBeenCalledWith('/goods-receipts/1')
  })

  it('navigates when Enter is pressed on a focused row (keyboard a11y)', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    const row = screen.getByText('GRN-2026-0001').closest('tr')!
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/goods-receipts/1')
  })

  it('shows the error box with a retry button that calls refetch', async () => {
    const { refetch } = setup({ data: undefined, isError: true })
    renderPage()
    expect(screen.getByText('โหลดข้อมูลการรับของไม่สำเร็จ')).toBeInTheDocument()
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
    vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<typeof useCurrentUser>)
    renderPage()
    expect(screen.queryByRole('button', { name: 'บันทึกการรับของ' })).not.toBeInTheDocument()
  })

  it('keeps the running number continuous across pages (uses meta.page)', () => {
    setup({
      data: listData([mockGrn, { ...mockGrn, id: 2, grnNumber: 'GRN-2026-0002' }], {
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
    setup({ data: listData([mockGrn], { total: 1, totalPages: 1 }) })
    renderPage()
    expect(screen.getByLabelText('จำนวนแถวต่อหน้า')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ก่อนหน้า/i })).not.toBeInTheDocument()
  })

  it('refetches on filter submit and keeps page reset to 1', async () => {
    setup({ data: listData([mockGrn]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const lastCall = vi.mocked(useGoodsReceipts).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ page: 1 }))
  })
})
