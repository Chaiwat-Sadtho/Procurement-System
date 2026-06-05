import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock the default-export axios client BEFORE importing the module under test
vi.mock('@/shared/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import api from '@/shared/lib/axios'
import { goodsReceiptsApi } from './api'

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

beforeEach(() => {
  mockApi.get.mockReset()
  mockApi.post.mockReset()
})

describe('goodsReceiptsApi.list', () => {
  it('GETs /goods-receipts with params and returns .data', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
    const out = await goodsReceiptsApi.list({ page: 2, status: 'partial' })
    expect(mockApi.get).toHaveBeenCalledWith('/goods-receipts', { params: { page: 2, status: 'partial' } })
    expect(out).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  })
})

describe('goodsReceiptsApi.get', () => {
  it('GETs /goods-receipts/:id and returns .data', async () => {
    mockApi.get.mockResolvedValue({ data: { id: 5, grnNumber: 'GRN-2026-0005' } })
    const out = await goodsReceiptsApi.get(5)
    expect(mockApi.get).toHaveBeenCalledWith('/goods-receipts/5')
    expect(out).toEqual({ id: 5, grnNumber: 'GRN-2026-0005' })
  })
})

describe('goodsReceiptsApi.create', () => {
  it('POSTs /goods-receipts with the payload and returns .data', async () => {
    const payload = {
      poId: 1,
      receivedDate: '2026-06-03',
      items: [{ poItemId: 11, receivedQuantity: 3, condition: 'good' as const }],
    }
    mockApi.post.mockResolvedValue({ data: { id: 9, grnNumber: 'GRN-2026-0009' } })
    const out = await goodsReceiptsApi.create(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/goods-receipts', payload)
    expect(out).toEqual({ id: 9, grnNumber: 'GRN-2026-0009' })
  })
})

describe('goodsReceiptsApi.listReceivablePOs', () => {
  it('GETs /purchase-orders?receivable=true&limit=100 and unwraps .data.data to an array', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        data: [{ id: 1, poNumber: 'PO-2026-0001', status: 'acknowledged' }],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    })
    const out = await goodsReceiptsApi.listReceivablePOs()
    expect(mockApi.get).toHaveBeenCalledWith('/purchase-orders', {
      params: { receivable: true, limit: 100 },
    })
    expect(out).toEqual([{ id: 1, poNumber: 'PO-2026-0001', status: 'acknowledged' }])
  })
})
