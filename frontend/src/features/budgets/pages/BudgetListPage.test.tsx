import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Budget } from '../types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useDepartments', () => ({ useDepartments: vi.fn() }))
// the filter form owns its own department source + year input; stub it to a single
// button that submits a fixed result so this test stays focused on the page's logic
// (search-first gate, manager dept-lock, remaining sort) not the filter internals.
vi.mock('../components/BudgetListFilterForm', () => ({
  BudgetListFilterForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
    <button type="button" onClick={() => onSubmit({ fiscalYear: 2026, departmentId: 999 })}>
      ค้นหา
    </button>
  ),
}))

import { useBudgets } from '../hooks/useBudgets'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'
import { BudgetListPage } from './BudgetListPage'

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

function renderPage() {
  return render(
    <MemoryRouter>
      <BudgetListPage />
    </MemoryRouter>,
  )
}

const poUser = { id: 9, role: 'procurement_officer', departmentId: 1 } as User
const managerUser = { id: 2, role: 'manager', departmentId: 7 } as User

describe('BudgetListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is search-first: the query is disabled (params null) and a prompt is shown before searching', () => {
    setup({ data: undefined })
    asUser(poUser)
    renderPage()
    // useBudgets is called with null until the user searches (hook enables on non-null)
    expect(vi.mocked(useBudgets).mock.calls[0][0]).toBeNull()
    expect(screen.getByText(/เลือกปีงบประมาณ/)).toBeInTheDocument()
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
})
