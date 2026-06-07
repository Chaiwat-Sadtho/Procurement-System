import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { DashboardBudget } from '@/features/dashboard/api'

vi.mock('@/features/dashboard/api', () => ({
  dashboardApi: { getBudgets: vi.fn() },
}))

import { dashboardApi } from '@/features/dashboard/api'
import { useBudgetForPR, matchBudgetForPR } from './useBudgetForPR'
import type { BudgetForPRPr } from './useBudgetForPR'

function makeBudget(over: Partial<DashboardBudget>): DashboardBudget {
  return {
    id: 1,
    departmentId: 3,
    department: { id: 3, name: 'IT' },
    fiscalYear: 2026,
    quarter: null,
    totalAmount: 1000,
    reservedAmount: 200,
    usedAmount: 100,
    ...over,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// A real eligible PurchaseRequest carries departmentId + quarter but NOT
// fiscalYear; BudgetForPRPr makes fiscalYear optional so this is valid.
const pr: BudgetForPRPr = { departmentId: 3, quarter: 2 }

describe('matchBudgetForPR', () => {
  it('matches the row with the same quarter as the PR', () => {
    const rows = [
      makeBudget({ id: 1, quarter: 1 }),
      makeBudget({ id: 2, quarter: 2 }),
      makeBudget({ id: 3, quarter: null }),
    ]
    expect(matchBudgetForPR(rows, pr)?.id).toBe(2)
  })

  it('matches the annual row (quarter null) when the PR quarter is null', () => {
    const rows = [makeBudget({ id: 1, quarter: 1 }), makeBudget({ id: 3, quarter: null })]
    expect(matchBudgetForPR(rows, { ...pr, quarter: null })?.id).toBe(3)
  })

  it('does NOT fall back to the annual row when the quarterly row is missing', () => {
    const rows = [makeBudget({ id: 1, quarter: 1 }), makeBudget({ id: 3, quarter: null })]
    // PR is Q2; only Q1 + annual exist -> no match (mirrors backend exact-match)
    expect(matchBudgetForPR(rows, pr)).toBeUndefined()
  })

  it('returns undefined for an empty list', () => {
    expect(matchBudgetForPR([], pr)).toBeUndefined()
  })
})

describe('useBudgetForPR', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches budgets for the PR department + explicit fiscal year', async () => {
    const rows = [makeBudget({ id: 2, quarter: 2 })]
    vi.mocked(dashboardApi.getBudgets).mockResolvedValue(rows)
    const { result } = renderHook(
      () => useBudgetForPR({ departmentId: 3, quarter: 2, fiscalYear: 2026 }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(dashboardApi.getBudgets).toHaveBeenCalledWith({
      departmentId: 3,
      fiscalYear: 2026,
    })
    expect(result.current.data).toEqual(rows)
  })

  it('stays idle when no PR is selected', () => {
    const { result } = renderHook(() => useBudgetForPR(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(dashboardApi.getBudgets).not.toHaveBeenCalled()
  })

  it('stays idle when the PR has no department', () => {
    const { result } = renderHook(() => useBudgetForPR({ departmentId: null, quarter: 2 }), {
      wrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(dashboardApi.getBudgets).not.toHaveBeenCalled()
  })

  it('defaults to the current year when the PR carries no fiscalYear', async () => {
    const rows = [makeBudget({ id: 9, quarter: 2 })]
    vi.mocked(dashboardApi.getBudgets).mockResolvedValue(rows)
    const thisYear = new Date().getFullYear()
    // No fiscalYear on the PR (the real PurchaseRequest shape) -> hook defaults.
    const { result } = renderHook(() => useBudgetForPR({ departmentId: 3, quarter: 2 }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(dashboardApi.getBudgets).toHaveBeenCalledWith({
      departmentId: 3,
      fiscalYear: thisYear,
    })
  })
})
