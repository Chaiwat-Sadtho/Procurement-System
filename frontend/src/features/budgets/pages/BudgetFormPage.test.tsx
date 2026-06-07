import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { BudgetSummary } from '../types'

vi.mock('../hooks/useBudgetSummary', () => ({ useBudgetSummary: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useDepartments', () => ({ useDepartments: vi.fn() }))
// Stub BudgetForm to echo the props the page wires: mode, the edit-only committed floor,
// and the seeded defaultValues. A wrong default (e.g. createDefaultValues on the edit path)
// would render dept=0|amount=, and a wrong committed would surface here.
vi.mock('../components/BudgetForm', () => ({
  BudgetForm: (props: {
    mode: 'create' | 'edit'
    committed?: number
    defaultValues: { departmentId: number; totalAmount: string }
  }) => (
    <div data-testid="budgetform">
      mode={props.mode}|committed={props.mode === 'edit' ? props.committed : 'na'}|dept=
      {props.defaultValues.departmentId}|amount={props.defaultValues.totalAmount}
    </div>
  ),
}))

import { useBudgetSummary } from '../hooks/useBudgetSummary'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'
import { BudgetFormPage } from './BudgetFormPage'

const budget: BudgetSummary = {
  id: 5,
  departmentId: 1,
  department: { id: 1, name: 'Engineering' },
  fiscalYear: 2026,
  quarter: null,
  totalAmount: 1000000,
  reservedAmount: 200000,
  usedAmount: 300000,
  remaining: 500000,
  usagePercent: 50,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function setBudget(over: Partial<{ data: unknown; isLoading: boolean; isError: boolean }>) {
  vi.mocked(useBudgetSummary).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...over,
  } as ReturnType<typeof useBudgetSummary>)
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/budgets/new" element={<BudgetFormPage />} />
        <Route path="/budgets/:id/edit" element={<BudgetFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BudgetFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDepartments).mockReturnValue({ data: [{ id: 1, name: 'Engineering' }] } as ReturnType<
      typeof useDepartments
    >)
    setBudget({ data: undefined })
  })

  it('create mode renders the create header + BudgetForm seeded with empty defaults', () => {
    renderAt('/budgets/new')
    expect(screen.getByText('สร้างงบประมาณ')).toBeInTheDocument()
    const form = screen.getByTestId('budgetform')
    expect(form).toHaveTextContent('mode=create')
    expect(form).toHaveTextContent('committed=na')
    // createDefaultValues seeds departmentId 0 (no preselected dept)
    expect(form).toHaveTextContent('dept=0')
  })

  it('edit mode renders the edit header + BudgetForm with committed = reserved + used', () => {
    setBudget({ data: budget })
    renderAt('/budgets/5/edit')
    expect(screen.getByText('แก้ไขงบประมาณ')).toBeInTheDocument()
    const form = screen.getByTestId('budgetform')
    expect(form).toHaveTextContent('mode=edit')
    // committed floor = reservedAmount(200000) + usedAmount(300000)
    expect(form).toHaveTextContent('committed=500000')
    // prefilled from budgetToFormValues, not createDefaultValues
    expect(form).toHaveTextContent('dept=1')
    expect(form).toHaveTextContent('amount=1000000')
  })

  it('edit mode shows a loading spinner while the summary loads', () => {
    setBudget({ isLoading: true })
    renderAt('/budgets/5/edit')
    expect(screen.queryByTestId('budgetform')).not.toBeInTheDocument()
  })

  it('edit mode shows a not-found notice on error', () => {
    setBudget({ isError: true })
    renderAt('/budgets/5/edit')
    expect(screen.getByText('ไม่พบงบประมาณ')).toBeInTheDocument()
    expect(screen.queryByTestId('budgetform')).not.toBeInTheDocument()
  })

  it('edit mode shows a not-found notice when the query settles with no budget and no error', () => {
    setBudget({ data: undefined, isLoading: false, isError: false })
    renderAt('/budgets/5/edit')
    expect(screen.getByText('ไม่พบงบประมาณ')).toBeInTheDocument()
  })
})
