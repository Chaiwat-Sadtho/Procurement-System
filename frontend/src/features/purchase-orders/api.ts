import api from '@/shared/lib/axios'
import type {
  CreatePORequest,
  GoodsReceiptSummary,
  POListParams,
  POListResponse,
  PurchaseOrder,
  RateVendorPayload,
  UpdatePORequest,
  VendorRating,
} from './types'

export const purchaseOrdersApi = {
  list: (params?: POListParams) =>
    api.get<POListResponse>('/purchase-orders', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data),

  create: (data: CreatePORequest) =>
    api.post<PurchaseOrder>('/purchase-orders', data).then((r) => r.data),

  update: (id: number, data: UpdatePORequest) =>
    api.patch<PurchaseOrder>(`/purchase-orders/${id}`, data).then((r) => r.data),

  send: (id: number) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/send`).then((r) => r.data),

  acknowledge: (id: number) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/acknowledge`).then((r) => r.data),

  cancel: (id: number) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`).then((r) => r.data),

  // bare array — endpoint ไม่ paginate (§4 D6), เรียง createdAt ASC ฝั่ง server
  getGoodsReceipts: (id: number) =>
    api
      .get<GoodsReceiptSummary[]>(`/purchase-orders/${id}/goods-receipts`)
      .then((r) => r.data),

  rate: (id: number, payload: RateVendorPayload) =>
    api.post<VendorRating>(`/purchase-orders/${id}/ratings`, payload).then((r) => r.data),

  getRating: (id: number) =>
    api.get<VendorRating | null>(`/purchase-orders/${id}/rating`).then((r) => r.data),
}
