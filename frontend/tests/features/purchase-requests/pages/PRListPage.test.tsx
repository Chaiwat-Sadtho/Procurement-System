import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { PRListPage } from '@/features/purchase-requests/pages/PRListPage'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

vi.mock('@/features/purchase-requests/hooks/usePurchaseRequests', () => ({
  usePurchaseRequests: vi.fn(),
}))

vi.mock('@/shared/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/features/purchase-requests/hooks/usePRMutations', () => ({
  usePRMutations: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { usePurchaseRequests } from '@/features/purchase-requests/hooks/usePurchaseRequests'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { usePRMutations } from '@/features/purchase-requests/hooks/usePRMutations'
import { toast } from 'sonner'
import type { User } from '@/shared/types'

const mockPR: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2025-0001',
  title: 'Office Supplies',
  status: 'draft',
  totalEstimatedAmount: 5000,
  quarter: null,
  requiredDate: '2025-02-01',
  requesterId: 1,
  requester: { id: 1, fullName: 'Test User', email: 'test@example.com' },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: null,
  approver: null,
  approvedAt: null,
  rejectReason: null,
  items: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const baseUser: User = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  middleName: null,
  lastName: 'User',
  fullName: 'Test User',
  role: 'employee',
  isActive: true,
  departmentId: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const employeeUser: User = { ...baseUser, id: 7, role: 'employee' }

type PRListData = {
  data: PurchaseRequest[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

const draftRow: PurchaseRequest = {
  ...mockPR,
  id: 3,
  prNumber: 'PR-2025-0003',
  status: 'draft',
  requesterId: employeeUser.id,
  requester: { id: employeeUser.id, fullName: 'Employee Owner', email: employeeUser.email },
}

const draftListData: PRListData = {
  data: [draftRow],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

const submittedListData: PRListData = {
  data: [{ ...draftRow, status: 'submitted' }],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

function setupMocks({
  user = baseUser,
  prData,
  isLoading = false,
}: {
  user?: User
  prData?:
    | {
        data: PurchaseRequest[]
        meta: { page: number; limit: number; total: number; totalPages: number }
      }
    | undefined
  isLoading?: boolean
}) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user, isLoading: false } as ReturnType<
    typeof useCurrentUser
  >)
  vi.mocked(usePurchaseRequests).mockReturnValue({ data: prData, isLoading } as ReturnType<
    typeof usePurchaseRequests
  >)
}

function setMutations() {
  const deleteMutation = { mutate: vi.fn(), isPending: false }
  vi.mocked(usePRMutations).mockReturnValue({
    deleteMutation,
  } as unknown as ReturnType<typeof usePRMutations>)
  return { deleteMutation }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PRListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function searchDateRange() {
  await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '01012569')
  const to = screen.getByLabelText(/วันที่สิ้นสุด/i)
  await userEvent.clear(to)
  await userEvent.type(to, '31122569')
  await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
  // commit routes through the hook's setState→effect (#47): hasSearched flips only
  // after the URL write lands a render later, so wait for the prompt to disappear
  await waitFor(() =>
    expect(screen.queryByText(/กรุณาเลือกช่วงวันที่และกดค้นหา/i)).not.toBeInTheDocument(),
  )
}

describe('PRListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMutations()
  })

  it('initial state: form visible + prompt message + usePurchaseRequests called with enabled=false', () => {
    setupMocks({ prData: undefined })

    renderPage()
    expect(screen.getByRole('button', { name: /ค้นหา/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/กรุณาเลือกช่วงวันที่และกดค้นหา/i)
    expect(vi.mocked(usePurchaseRequests).mock.calls[0][1]).toEqual({ enabled: false })
  })

  it('a deep link with ?q= fetches immediately and restores every filter from the URL', () => {
    setupMocks({ user: { ...baseUser, role: 'manager' }, prData: undefined })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/purchase-requests?q=1&status=approved&from=2026-01-01&to=2026-12-31&search=office&requesterName=somchai',
          ]}
        >
          <PRListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const firstCall = vi.mocked(usePurchaseRequests).mock.calls[0]
    expect(firstCall[0]).toEqual(
      expect.objectContaining({
        status: 'approved',
        from: '2026-01-01',
        to: '2026-12-31',
        search: 'office',
        requesterName: 'somchai',
      }),
    )
    expect(firstCall[1]).toEqual({ enabled: true })
    // the form is restored too (not just the query)
    expect(screen.getByLabelText(/วันที่เริ่มต้น/i)).toHaveValue('01/01/2569')
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('อนุมัติแล้ว')
  })

  it('a deep link carrying ?status= but no ?q= shows the prompt (status alone is not a search)', () => {
    setupMocks({ prData: undefined })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/purchase-requests?status=draft']}>
          <PRListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/กรุณาเลือกช่วงวันที่และกดค้นหา/i)
    expect(vi.mocked(usePurchaseRequests).mock.calls[0][1]).toEqual({ enabled: false })
  })

  it('after submit with valid dates: usePurchaseRequests called with filter params', async () => {
    setupMocks({ prData: undefined })

    renderPage()
    await searchDateRange()

    const lastCall = vi.mocked(usePurchaseRequests).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(
      expect.objectContaining({ from: '2026-01-01', to: '2026-12-31', page: 1 }),
    )
    expect(lastCall[1]).toEqual({ enabled: true })
  })

  it('Employee: form has no Requester field', () => {
    setupMocks({ user: { ...baseUser, role: 'employee' }, prData: undefined })
    renderPage()
    expect(screen.queryByLabelText(/ผู้ขอ/i)).not.toBeInTheDocument()
  })

  it('Manager: form has Requester field', () => {
    setupMocks({ user: { ...baseUser, role: 'manager' }, prData: undefined })
    renderPage()
    expect(screen.getByLabelText(/ผู้ขอ/i)).toBeInTheDocument()
  })

  it('shows loading skeleton after submit', async () => {
    setupMocks({ prData: undefined, isLoading: true })

    renderPage()
    await searchDateRange()

    const loading = screen.getByTestId('pr-list-loading')
    expect(loading).toBeInTheDocument()
    expect(loading).toHaveAttribute('aria-busy', 'true')
  })

  it('renders table with bg-table-header + table-fixed when data is loaded', async () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    })

    renderPage()
    await searchDateRange()

    expect(screen.getByText('PR-2025-0001')).toBeInTheDocument()
    expect(screen.getByText('Office Supplies')).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')

    const thead = table.querySelector('thead')
    expect(thead).toHaveClass('bg-table-header')
  })

  it('ลำดับ column shows running number continuous across pagination', async () => {
    setupMocks({
      prData: {
        data: [mockPR, { ...mockPR, id: 2, prNumber: 'PR-2025-0002' }],
        meta: { page: 2, limit: 20, total: 22, totalPages: 2 },
      },
    })

    renderPage()
    await searchDateRange()

    // page=2, limit=20 → row 0 = 21, row 1 = 22
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('shows New PR button only for employee role', () => {
    setupMocks({
      user: { ...baseUser, role: 'employee' },
      prData: {
        data: [] as PurchaseRequest[],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
    })

    renderPage()
    expect(screen.getByRole('link', { name: /new pr/i })).toBeInTheDocument()
  })

  it('ล้าง returns to initial prompt and disables the query', async () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    })

    renderPage()
    await searchDateRange()
    expect(screen.getByText('PR-2025-0001')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))

    // clear also routes through the hook's setState→effect — wait for the prompt back
    await waitFor(() =>
      expect(screen.getByText(/กรุณาเลือกช่วงวันที่และกดค้นหา/i)).toBeInTheDocument(),
    )
    const lastCall = vi.mocked(usePurchaseRequests).mock.calls.at(-1)!
    expect(lastCall[1]).toEqual({ enabled: false })
  })

  it('shows Edit/Delete on a draft row for the employee owner', async () => {
    setupMocks({ user: employeeUser, prData: draftListData })
    renderPage()
    await searchDateRange()
    expect(screen.getByRole('link', { name: 'แก้ไข' })).toHaveAttribute(
      'href',
      '/purchase-requests/3/edit',
    )
    expect(screen.getByRole('button', { name: 'ลบ' })).toBeInTheDocument()
  })

  it('hides Edit/Delete on a non-draft row', async () => {
    setupMocks({ user: employeeUser, prData: submittedListData })
    renderPage()
    await searchDateRange()
    expect(screen.queryByRole('link', { name: 'แก้ไข' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ลบ' })).not.toBeInTheDocument()
  })

  it('deletes a draft row after confirming', async () => {
    setupMocks({ user: employeeUser, prData: draftListData })
    const { deleteMutation } = setMutations()
    deleteMutation.mutate.mockImplementation((_id: number, opts: { onSuccess: () => void }) =>
      opts.onSuccess(),
    )
    renderPage()
    await searchDateRange()
    await userEvent.click(screen.getByRole('button', { name: 'ลบ' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }))
    expect(deleteMutation.mutate).toHaveBeenCalledWith(3, expect.anything())
    expect(toast.success).toHaveBeenCalledWith('ลบใบร่างแล้ว')
  })

  it('shows the footer with PageSizeSelect when results exist (status from URL)', () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 5, total: 1, totalPages: 1 } },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/purchase-requests?q=1&status=draft']}>
          <PRListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByLabelText('จำนวนแถวต่อหน้า')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('changes page size: limit flows to the query and page resets to 1', async () => {
    // start at &page=3 to prove the reset (q=1 + status=draft to enable the query)
    setupMocks({
      prData: { data: [mockPR], meta: { page: 3, limit: 5, total: 30, totalPages: 6 } },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/purchase-requests?q=1&status=draft&page=3']}>
          <PRListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    await userEvent.click(await screen.findByRole('option', { name: '20' }))
    const lastCall = vi.mocked(usePurchaseRequests).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(expect.objectContaining({ limit: 20, page: 1, status: 'draft' }))
  })

  // co-locates the Task-4 "preserve ?status=" requirement at the page level:
  // proves the merge-safe URL write keeps ?status= when only the page size changes
  // (a merge-unsafe regression that wiped the URL would still leave the query green
  // via component state, so assert the actual URL here)
  it('preserves ?status= in the URL when the page size changes (merge-safe)', async () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 5, total: 30, totalPages: 6 } },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function LocationProbe() {
      const { search } = useLocation()
      return <div data-testid="loc-search">{search}</div>
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/purchase-requests?q=1&status=draft']}>
          <PRListPage />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    await userEvent.click(await screen.findByRole('option', { name: '20' }))
    const loc = screen.getByTestId('loc-search')
    expect(loc).toHaveTextContent('status=draft')
    expect(loc).toHaveTextContent('limit=20')
  })

  // half-persist fix: changing the status filter + submitting must rewrite ?status=
  // in the URL, else a reload/deep-link silently restores the stale URL status.
  it('syncs the chosen status into the URL on submit (reload/deep-link safe)', async () => {
    setupMocks({ prData: undefined })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function LocationProbe() {
      const { search } = useLocation()
      return <div data-testid="loc-search">{search}</div>
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/purchase-requests?status=draft&page=3']}>
          <PRListPage />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    // fill required dates first (opening the Select portal before typing steals
    // focus from the date inputs and the form fails validation)
    await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '01012569')
    const to = screen.getByLabelText(/วันที่สิ้นสุด/i)
    await userEvent.clear(to)
    await userEvent.type(to, '31122569')
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'อนุมัติแล้ว' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    // status synced + page reset to 1 (the effect writes after the async submit settles)
    await waitFor(() => {
      expect(screen.getByTestId('loc-search')).toHaveTextContent('status=approved')
    })
    expect(screen.getByTestId('loc-search')).toHaveTextContent('page=1')
  })

  // StrictMode double-invokes the hook's write effect on mount; with action===null
  // on mount it must be a no-op, else a deep-linked ?page= would be wiped to 1.
  it('preserves a deep-linked page on mount under StrictMode (no spurious write)', () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 3, limit: 5, total: 30, totalPages: 6 } },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function LocationProbe() {
      const { search } = useLocation()
      return <div data-testid="loc-search">{search}</div>
    }
    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/purchase-requests?q=1&status=draft&page=3']}>
            <PRListPage />
            <LocationProbe />
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    )
    expect(screen.getByTestId('loc-search')).toHaveTextContent('page=3')
    expect(vi.mocked(usePurchaseRequests).mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: 'draft', page: 3 }),
    )
  })

  it('removes ?status= from the URL on clear', async () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 5, total: 1, totalPages: 1 } },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function LocationProbe() {
      const { search } = useLocation()
      return <div data-testid="loc-search">{search}</div>
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/purchase-requests?status=draft']}>
          <PRListPage />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await searchDateRange()
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(screen.getByTestId('loc-search')).not.toHaveTextContent('status=')
  })
})
