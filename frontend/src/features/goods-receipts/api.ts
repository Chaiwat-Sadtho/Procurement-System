import api from '@/shared/lib/axios'
import type {
  CreateGoodsReceiptPayload,
  GoodsReceipt,
  GRNListParams,
  GRNListResponse,
  ReceivablePO,
} from './types'

export const goodsReceiptsApi = {
  list: (params?: GRNListParams) =>
    api.get<GRNListResponse>('/goods-receipts', { params }).then((r) => r.data),

  get: (id: number) => api.get<GoodsReceipt>(`/goods-receipts/${id}`).then((r) => r.data),

  create: (data: CreateGoodsReceiptPayload) =>
    api.post<GoodsReceipt>('/goods-receipts', data).then((r) => r.data),

  // the endpoint returns {data, meta}; the picker wants a flat array
  listReceivablePOs: () =>
    api
      .get<{ data: ReceivablePO[]; meta: unknown }>('/purchase-orders', {
        params: { receivable: true, limit: 100 },
      })
      .then((r) => r.data.data),

  // POs that already have a GRN, for the history filter dropdown
  listPOsWithReceipts: () =>
    api
      .get<{ data: ReceivablePO[]; meta: unknown }>('/purchase-orders', {
        params: { withReceipts: true, limit: 100 },
      })
      .then((r) => r.data.data),
}
