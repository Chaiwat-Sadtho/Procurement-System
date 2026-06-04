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
  vi.mocked(useVendors).mockReturnValue({ data, isLoading, isError, refetch } as unknown as ReturnType<typeof useVendors>)
  vi.mocked(useVendorCategories).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useVendorCategories>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
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
  beforeEach(() => vi.clearAllMocks())

  it('fetches immediately on mount with enabled=true and no isBlacklisted param (all)', () => {
    setup({ data: undefined })
    renderPage()
    const firstCall = vi.mocked(useVendors).mock.calls[0]
    expect(firstCall[0]).toEqual(expect.objectContaining({ page: 1, limit: 5 }))
    expect(firstCall[0]?.isBlacklisted).toBeUndefined()
    expect(firstCall[0]?.categoryId).toBeUndefined()
    expect(firstCall[1]).toEqual({ enabled: true })
  })

  it('shows the loading skeleton', () => {
    setup({ data: undefined, isLoading: true })
    renderPage()
    const loading = screen.getByTestId('vendor-list-loading')
    expect(loading).toBeInTheDocument()
    expect(loading).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the empty row inside the table when data is empty', () => {
    setup({ data: listData([], { total: 0, totalPages: 0 }) })
    renderPage()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toHaveAttribute('role', 'status')
  })

  it('shows the empty row defensively when data is undefined (not loading, not error)', () => {
    setup({ data: undefined })
    renderPage()
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
  })

  it('renders the table (table-fixed + bg-table-header) with vendor fields', () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText('0105551234567')).toBeInTheDocument()
    expect(screen.getByText('sales@acme.test')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument() // ratingAvg '4.50' → '4.5'
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('thead')).toHaveClass('bg-table-header')
  })

  it('renders first two category badges plus an ellipsis badge when more than two', () => {
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
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('…')).toBeInTheDocument()
    expect(screen.queryByText('Services')).not.toBeInTheDocument()
  })

  it('renders em dash for null taxId / rating / empty categories', () => {
    const sparse: Vendor = {
      ...mockVendor,
      id: 2,
      taxId: null,
      ratingAvg: null,
      categories: [],
    }
    setup({ data: listData([sparse]) })
    renderPage()
    // taxId, rating, categories all show "—" → at least 3 dashes present
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })

  it('navigates to the detail route when a row is clicked', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.click(screen.getByText('ACME Corp'))
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/1')
  })

  it('navigates when Enter is pressed on a focused row (keyboard a11y)', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    const row = screen.getByText('ACME Corp').closest('tr')!
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/1')
  })

  it('shows the error box with a retry button that calls refetch', async () => {
    const { refetch } = setup({ data: undefined, isError: true })
    renderPage()
    expect(screen.getByText('โหลดข้อมูลผู้ขายไม่สำเร็จ')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดข้อมูลผู้ขายไม่สำเร็จ')
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('maps the typed search into the query params on submit', async () => {
    setup({ data: listData([mockVendor]) })
    renderPage()
    await userEvent.type(screen.getByLabelText('ชื่อผู้ขาย'), 'ACME')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    const lastCall = vi.mocked(useVendors).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'ACME', page: 1 }))
  })

  it('keeps the running number continuous across pages (uses meta.page)', () => {
    setup({
      data: listData([mockVendor, { ...mockVendor, id: 2, name: 'Beta Co' }], {
        page: 2,
        total: 22,
        totalPages: 2,
      }),
    })
    renderPage()
    // page=2, limit=20 → row 0 = 21, row 1 = 22
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('disables Previous on page 1 and shows pagination only when totalPages > 1', () => {
    setup({ data: listData([mockVendor], { total: 30, totalPages: 2 }) })
    renderPage()
    expect(screen.getByRole('button', { name: /ก่อนหน้า/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /ถัดไป/i })).toBeEnabled()
  })

  it('shows the footer with PageSizeSelect even when there is only one page', () => {
    setup({ data: listData([mockVendor], { total: 1, totalPages: 1 }) })
    renderPage()
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
    vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<typeof useCurrentUser>)
    renderPage()
    expect(screen.queryByRole('button', { name: 'เพิ่มผู้ขาย' })).not.toBeInTheDocument()
  })
})
