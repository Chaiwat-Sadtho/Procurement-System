import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Budget } from '@/features/budgets/types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/features/budgets/hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useDepartments', () => ({ useDepartments: vi.fn() }))
// the filter form owns its own department source + year input; stub it to two buttons
// (search + clear) so this test stays focused on the page's logic (search-first gate,
// manager dept-lock, remaining sort, URL write) not the filter internals. mockFilter.values
// lets a test drive a specific submission so the value->URL/query mapping is exercised.
const mockFilter = vi.hoisted(() => ({
  values: { fiscalYear: 2026, departmentId: 999 } as { fiscalYear: number; departmentId?: number },
}))
vi.mock('@/features/budgets/components/BudgetListFilterForm', () => ({
  BudgetListFilterForm: ({
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

import { useBudgets } from '@/features/budgets/hooks/useBudgets'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'
import { BudgetListPage } from '@/features/budgets/pages/BudgetListPage'

function budget(over: Partial<Budget>): Budget {
  return {
    id: 1,
    departmentId: 1,
    department: { id: 1, name: 'Alpha Dept' },
    fiscalYear: 2026,
    quarter: null,
    totalAmount: 1000,
    reservedAmount: 0,
    usedAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function setup({
  data,
  isLoading = false,
  isError = false,
}: {
  data?: Budget[]
  isLoading?: boolean
  isError?: boolean
} = {}) {
  const refetch = vi.fn()
  vi.mocked(useBudgets).mockReturnValue({ data, isLoading, isError, refetch } as unknown as ReturnType<
    typeof useBudgets
  >)
  vi.mocked(useDepartments).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useDepartments
  >)
  return { refetch }
}

function asUser(u: Partial<User> | undefined) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: u } as unknown as ReturnType<
    typeof useCurrentUser
  >)
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
      <BudgetListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { ...utils, locRef }
}

const poUser = { id: 9, role: 'procurement_officer', departmentId: 1 } as User
const managerUser = { id: 2, role: 'manager', departmentId: 7 } as User

describe('BudgetListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFilter.values = { fiscalYear: 2026, departmentId: 999 }
  })

  it('is search-first: the query is disabled (enabled:false) and a prompt is shown before searching', () => {
    setup({ data: undefined })
    asUser(poUser)
    renderPage()
    // the query stays disabled (enabled:false) until the user searches; params is always a real object
    expect(vi.mocked(useBudgets).mock.calls[0][1]).toEqual({ enabled: false })
    expect(screen.getByRole('status')).toHaveTextContent(/เลือกปีงบประมาณ/)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('applies the chosen fiscal year + department for a procurement officer', async () => {
    setup({ data: [] })
    asUser(poUser)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    expect(vi.mocked(useBudgets).mock.calls.at(-1)![0]).toEqual({
      fiscalYear: 2026,
      departmentId: 999,
    })
  })

  it('forces a manager onto their own department (ignores the submitted departmentId)', async () => {
    setup({ data: [] })
    asUser(managerUser)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    expect(vi.mocked(useBudgets).mock.calls.at(-1)![0]).toEqual({
      fiscalYear: 2026,
      departmentId: 7,
    })
  })

  it('sorts result rows by remaining ascending (closest-to-exhausted first)', async () => {
    setup({
      data: [
        budget({ id: 1, department: { id: 1, name: 'Alpha Dept' }, totalAmount: 1000 }), // remaining 1000
        budget({
          id: 2,
          department: { id: 2, name: 'Beta Dept' },
          totalAmount: 1000,
          reservedAmount: 900,
        }), // remaining 100
      ],
    })
    asUser(poUser)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    const rows = screen.getAllByRole('row')
    // rows[0] = header; the lowest-remaining budget (Beta) must come first
    expect(rows[1]).toHaveTextContent('Beta Dept')
    expect(rows[2]).toHaveTextContent('Alpha Dept')
  })

  it('shows the create button for a procurement officer and navigates to new', async () => {
    setup({ data: [] })
    asUser(poUser)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'สร้างงบประมาณ' }))
    expect(mockNavigate).toHaveBeenCalledWith('/budgets/new')
  })

  it('hides the create button for a manager', () => {
    setup({ data: [] })
    asUser(managerUser)
    renderPage()
    expect(screen.queryByRole('button', { name: 'สร้างงบประมาณ' })).not.toBeInTheDocument()
  })

  // --- filters in URL ---

  it('restores filters from the URL and auto-searches when q is present', () => {
    setup({ data: [] })
    asUser(poUser)
    renderPage(['/?q=1&fiscalYear=2025'])
    expect(vi.mocked(useBudgets).mock.calls[0][1]).toEqual({ enabled: true })
    expect(vi.mocked(useBudgets).mock.calls[0][0].fiscalYear).toBe(2025)
    expect(screen.getByRole('table')).toBeInTheDocument() // auto-searched (not the prompt)
  })

  it('parses URL filters even without q but stays on the prompt (parse independent of q)', () => {
    setup({ data: [] })
    asUser(poUser)
    renderPage(['/?fiscalYear=2025'])
    expect(vi.mocked(useBudgets).mock.calls[0][1]).toEqual({ enabled: false })
    expect(vi.mocked(useBudgets).mock.calls[0][0].fiscalYear).toBe(2025)
    expect(screen.getByRole('status')).toHaveTextContent(/เลือกปีงบประมาณ/)
  })

  it('writes q + fiscalYear to the URL on submit, with no page param (not paginated)', async () => {
    setup({ data: [] })
    asUser(poUser)
    mockFilter.values = { fiscalYear: 2025, departmentId: undefined }
    const { locRef } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    const params = new URLSearchParams(locRef.current)
    expect(params.get('q')).toBe('1')
    expect(params.get('fiscalYear')).toBe('2025')
    expect(params.has('page')).toBe(false)
  })

  it('removes q + filters from the URL on clear, with no page param', async () => {
    setup({ data: [] })
    asUser(poUser)
    const { locRef } = renderPage(['/?q=1&fiscalYear=2025'])
    expect(screen.getByRole('table')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/i }))
    const params = new URLSearchParams(locRef.current)
    expect(params.has('q')).toBe(false)
    expect(params.has('fiscalYear')).toBe(false)
    expect(params.has('page')).toBe(false)
    expect(screen.getByRole('status')).toHaveTextContent(/เลือกปีงบประมาณ/)
  })

  it('forces a manager onto their own department even when the URL names another (restore)', () => {
    setup({ data: [] })
    asUser(managerUser) // departmentId 7
    renderPage(['/?q=1&fiscalYear=2026&departmentId=999'])
    expect(vi.mocked(useBudgets).mock.calls[0][0].departmentId).toBe(7)
  })
})
