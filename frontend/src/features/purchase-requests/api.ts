import api from '@/shared/lib/axios'
import type { CreatePRRequest, PRListResponse, PurchaseRequest, UpdatePRRequest } from './types'

interface PRListParams {
  page?: number
  limit?: number
  status?: string
  prNumber?: string
  search?: string
  requesterName?: string
  from?: string
  to?: string
}

export const purchaseRequestsApi = {
  list: (params?: PRListParams) =>
    api.get<PRListResponse>('/purchase-requests', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<PurchaseRequest>(`/purchase-requests/${id}`).then((r) => r.data),

  create: (data: CreatePRRequest) =>
    api.post<PurchaseRequest>('/purchase-requests', data).then((r) => r.data),

  update: (id: number, data: UpdatePRRequest) =>
    api.patch<PurchaseRequest>(`/purchase-requests/${id}`, data).then((r) => r.data),

  submit: (id: number) =>
    api.post<PurchaseRequest>(`/purchase-requests/${id}/submit`).then((r) => r.data),

  approve: (id: number) =>
    api.post<PurchaseRequest>(`/purchase-requests/${id}/approve`).then((r) => r.data),

  reject: (id: number, reason: string) =>
    api
      .post<PurchaseRequest>(`/purchase-requests/${id}/reject`, { reason })
      .then((r) => r.data),
}
