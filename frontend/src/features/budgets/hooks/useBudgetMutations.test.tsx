import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Budget, CreateBudgetRequest, UpdateBudgetRequest } from '../types'

vi.mock('../api', () => ({
  budgetsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

import { budgetsApi } from '../api'
import { useBudgetMutations } from './useBudgetMutations'

const fakeBudget = { id: 7 } as Budget

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useBudgetMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create calls api.create with the payload and invalidates the list', async () => {
    vi.mocked(budgetsApi.create).mockResolvedValue(fakeBudget)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useBudgetMutations(), { wrapper: makeWrapper(qc) })

    const payload: CreateBudgetRequest = {
      departmentId: 3,
      fiscalYear: 2026,
      quarter: null,
      totalAmount: 1000000,
    }
    await result.current.createMutation.mutateAsync(payload)

    expect(budgetsApi.create).toHaveBeenCalledWith(payload)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['budgets'] }))
  })

  it('update calls api.update with id + data and invalidates the singular budget + the list', async () => {
    vi.mocked(budgetsApi.update).mockResolvedValue(fakeBudget)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useBudgetMutations(), { wrapper: makeWrapper(qc) })

    const data: UpdateBudgetRequest = { totalAmount: 1500000 }
    await result.current.updateMutation.mutateAsync({ id: 3, data })

    expect(budgetsApi.update).toHaveBeenCalledWith(3, data)
    await waitFor(() => {
      // ['budget', 3] is a prefix of ['budget', 3, 'summary'] / ['budget', 3, 'transactions'],
      // so react-query fuzzy matching invalidates the detail's summary + money trail too.
      expect(spy).toHaveBeenCalledWith({ queryKey: ['budget', 3] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['budgets'] })
    })
  })
})
