import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { VendorListPage } from './VendorListPage'
import type { Vendor, VendorListResponse } from '../types'

vi.mock('../hooks/useVendors', () => ({ useVendors: vi.fn() }))
vi.mock('../hooks/useVendorCategories', () => ({ useVendorCategories: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))

// vi.mock is hoisted above the module body, so the factory can't read a plain
// `const mockNavigate` (temporal dead zone). Use vi.hoisted to lift it safely.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockFilter = vi.hoisted(() => ({
  values: { search: '', isBlacklisted: 'all', categoryId: 'all' } as {
    search: string
    isBlacklisted: string
    categoryId: string
  },
}))
vi.mock('../components/VendorListFilterForm', () => ({
  VendorListFilterForm: ({
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

import { useVendors } from '../hooks/useVendors'
import { useVendorCategories } from '../hooks/useVendorCategories'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import type { User } from '@/shared/types'

const mockVendor: Vendor = {
  id: 1,
  name: 'ACME Corp',
  taxId: '0105551234567',
  email: 'sales@acme.test',
  phone: '021234567',
  address: 'Bangkok',
  isBlacklisted: false,
  blacklistReason: null,
  ratingAvg: '4.50',
  categories: [{ id: 1, name: 'Hardware' }],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function listData(
  data: Vendor[],
  meta: Partial<VendorListResponse['meta']> = {},
): VendorListResponse {
  return {
    data,
    meta: { page: 1, limit: 20, total: data.length, totalPages: 1, ...meta },
  }
}

function setup({
  data,
  isLoading = false,
  isError = false,
}: {
  data?: VendorListResponse
  isLoading?: boolean
  isError?: boolean
}) {
  const refetch = vi.fn()
  vi.mocked(useVendors).mockReturnValue({
    data,
    isLoading,
    isError,
    refetch,
  } as unknown as ReturnType<typeof useVendors>)
  vi.mocked(useVendorCategories).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useVendorCategories
  >)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<
    typeof useCurrentUser
  >)
  return { refetch }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <VendorListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('VendorListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFilter.values = { search: '', isBlacklisted: 'all', categoryId: 'all' }
  })

  it('is search-first: query disabled and a prompt is shown before searching', () => {
    setup({ data: undefined })
    renderPage()
    expect(vi.mocked(useVendors).mock.calls[0][1]).toEqual({ enabled: false })
    expect(screen.getByText(/กดค้นหาเพื่อแสดงผู้ขาย/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('enables the query and shows the table after pressing ค้นหา', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(vi.mocked(useVendors).mock.calls.at(-1)![1]).toEqual({ enabled: true })
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
  })

  it('returns to the prompt after ล้าง', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/กดค้นหาเพื่อแสดงผู้ขาย/)).toBeInTheDocument()
  })

  it('shows the loading skeleton', async () => {
    setup({ data: undefined, isLoading: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const loading = screen.getByTestId('vendor-list-loading')
    expect(loading).toBeInTheDocument()
    expect(loading).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the empty row inside the table when data is empty', async () => {
    setup({ data: listData([], { total: 0, totalPages: 0 }) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toHaveAttribute('role', 'status')
  })

  // "data undefined before searching" is now covered by the search-first prompt test above.
  // After clicking ค้นหา with data=undefined the gate opens and the empty row is shown
  // (same as the empty-data test), so a separate "undefined" test would be redundant — removed.

  it('renders the table (table-fixed + bg-table-header) with vendor fields', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText('0105551234567')).toBeInTheDocument()
    expect(screen.getByText('sales@acme.test')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument() // ratingAvg '4.50' → '4.5'
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('thead')).toHaveClass('bg-table-header')
  })

  it('renders first two category badges plus an ellipsis badge when more than two', async () => {
    const many: Vendor = {
      ...mockVendor,
      categories: [
        { id: 1, name: 'Hardware' },
        { id: 2, name: 'Software' },
        { id: 3, name: 'Services' },
      ],
    }
    setup({ data: listData([many]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('…')).toBeInTheDocument()
    expect(screen.queryByText('Services')).not.toBeInTheDocument()
  })

  it('renders em dash for null taxId / rating / empty categories', async () => {
    const sparse: Vendor = {
      ...mockVendor,
      id: 2,
      taxId: null,
      ratingAvg: null,
      categories: [],
    }
    setup({ data: listData([sparse]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    // taxId, rating, categories all show "—" → at least 3 dashes present
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })

  it('navigates when a non-link cell of the row is clicked (whole-row mouse target)', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    // click a NON-link cell (taxId); the name cell is the link, which stops propagation
    await userEvent.click(screen.getByText('0105551234567'))
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/1')
  })

  it('exposes the name as a real link, and clicking it does not double-fire the row onClick', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const link = screen.getByRole('link', { name: 'ACME Corp' })
    expect(link).toHaveAttribute('href', '/vendors/1')
    // stopPropagation guard: the link handles nav; the row onClick must not also fire
    await userEvent.click(link)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows the error box with a retry button that calls refetch', async () => {
    const { refetch } = setup({ data: undefined, isError: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByText('โหลดข้อมูลผู้ขายไม่สำเร็จ')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดข้อมูลผู้ขายไม่สำเร็จ')
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('maps the search filter into the query params on submit', async () => {
    setup({ data: listData([mockVendor]) })
    mockFilter.values = { search: 'ACME', isBlacklisted: 'all', categoryId: 'all' }
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const lastCall = vi.mocked(useVendors).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'ACME', page: 1 }))
  })

  it('keeps the running number continuous across pages (uses meta.page)', async () => {
    setup({
      data: listData([mockVendor, { ...mockVendor, id: 2, name: 'Beta Co' }], {
        page: 2,
        total: 22,
        totalPages: 2,
      }),
    })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    // page=2, limit=20 → row 0 = 21, row 1 = 22
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('disables Previous on page 1 and shows pagination only when totalPages > 1', async () => {
    setup({ data: listData([mockVendor], { total: 30, totalPages: 2 }) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByRole('button', { name: /ก่อนหน้า/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /ถัดไป/i })).toBeEnabled()
  })

  it('shows the footer with PageSizeSelect even when there is only one page', async () => {
    setup({ data: listData([mockVendor], { total: 1, totalPages: 1 }) })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(screen.getByLabelText('จำนวนแถวต่อหน้า')).toBeInTheDocument()
    // one page -> no prev/next buttons
    expect(screen.queryByRole('button', { name: /ก่อนหน้า/i })).not.toBeInTheDocument()
  })

  it('changes page size: limit flows to the query and page resets to 1', async () => {
    // start at ?page=3 to prove the reset really happens (page=1 start would be vacuous)
    setup({ data: listData([mockVendor], { total: 30, totalPages: 6, page: 3 }) })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/?page=3']}>
          <VendorListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    await userEvent.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    await userEvent.click(await screen.findByRole('option', { name: '20' }))
    const lastCall = vi.mocked(useVendors).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ limit: 20, page: 1 }))
  })

  const poUser = { id: 1, role: 'procurement_officer' } as User
  const managerUser = { id: 2, role: 'manager' } as User

  it('shows the เพิ่มผู้ขาย button for a procurement officer and navigates to new', async () => {
    setup({ data: listData([mockVendor]) })
    vi.mocked(useCurrentUser).mockReturnValue({ data: poUser } as ReturnType<typeof useCurrentUser>)
    renderPage()
    const addBtn = screen.getByRole('button', { name: 'เพิ่มผู้ขาย' })
    await userEvent.click(addBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/new')
  })

  it('hides the เพิ่มผู้ขาย button for a manager', () => {
    setup({ data: listData([mockVendor]) })
    vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<
      typeof useCurrentUser
    >)
    renderPage()
    expect(screen.queryByRole('button', { name: 'เพิ่มผู้ขาย' })).not.toBeInTheDocument()
  })
})
