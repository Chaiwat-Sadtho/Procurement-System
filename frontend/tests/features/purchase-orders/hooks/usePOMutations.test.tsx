import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PurchaseOrder, CreatePORequest, UpdatePORequest } from '@/features/purchase-orders/types'

vi.mock('@/features/purchase-orders/api', () => ({
  purchaseOrdersApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

import { purchaseOrdersApi } from '@/features/purchase-orders/api'
import { usePOMutations } from '@/features/purchase-orders/hooks/usePOMutations'

const fakePO = { id: 7 } as PurchaseOrder

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

describe('usePOMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create calls api.create with the payload and invalidates the list', async () => {
    vi.mocked(purchaseOrdersApi.create).mockResolvedValue(fakePO)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePOMutations(), {
      wrapper: makeWrapper(qc),
    })
    // request DTO: quantity/unitPrice = number (decimal-as-string เฉพาะ response), notes?: string
    const payload: CreatePORequest = {
      prId: 1,
      vendorId: 2,
      expectedDeliveryDate: '2026-07-01',
      notes: 'หมายเหตุ',
      items: [{ prItemId: 10, itemName: 'ปากกา', quantity: 5, unit: 'กล่อง', unitPrice: 20 }],
    }
    await result.current.createMutation.mutateAsync(payload)
    expect(purchaseOrdersApi.create).toHaveBeenCalledWith(payload)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] })
      // a new PO consumes its PR → drop it from the eligible-for-PO picker (M3)
      expect(spy).toHaveBeenCalledWith({
        queryKey: ['purchase-requests', { eligibleForPo: true }],
      })
      // budget surface (reserved delta): list/preview + detail money-trail + dashboard
      expect(spy).toHaveBeenCalledWith({ queryKey: ['budgets'] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['budget'] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboard', 'budgets'] })
      // exclusivity: exactly these 5, no over-invalidation creep
      expect(spy).toHaveBeenCalledTimes(5)
    })
  })

  it('update calls api.update with id + data and invalidates singular + plural', async () => {
    vi.mocked(purchaseOrdersApi.update).mockResolvedValue(fakePO)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePOMutations(), {
      wrapper: makeWrapper(qc),
    })
    const data: UpdatePORequest = { notes: 'แก้ไข' }
    await result.current.updateMutation.mutateAsync({ id: 3, data })
    expect(purchaseOrdersApi.update).toHaveBeenCalledWith(3, data)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 3] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] })
      // budget surface (edited items re-adjust reserved delta)
      expect(spy).toHaveBeenCalledWith({ queryKey: ['budgets'] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['budget'] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboard', 'budgets'] })
      // update does NOT touch the eligible-picker (PR already linked); exactly 5
      expect(spy).not.toHaveBeenCalledWith({
        queryKey: ['purchase-requests', { eligibleForPo: true }],
      })
      expect(spy).toHaveBeenCalledTimes(5)
    })
  })
})
