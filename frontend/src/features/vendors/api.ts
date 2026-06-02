import api from '@/shared/lib/axios'
import type { Vendor, VendorCategory, VendorListParams, VendorListResponse, VendorPayload } from './types'

export const vendorsApi = {
  list: (params?: VendorListParams) =>
    api.get<VendorListResponse>('/vendors', { params }).then((r) => r.data),

  get: (id: number) => api.get<Vendor>(`/vendors/${id}`).then((r) => r.data),

  create: (data: VendorPayload) =>
    api.post<Vendor>('/vendors', data).then((r) => r.data),

  update: (id: number, data: VendorPayload) =>
    api.patch<Vendor>(`/vendors/${id}`, data).then((r) => r.data),

  blacklist: (id: number, reason: string) =>
    api.post<Vendor>(`/vendors/${id}/blacklist`, { reason }).then((r) => r.data),

  unblacklist: (id: number) =>
    api.delete<Vendor>(`/vendors/${id}/blacklist`).then((r) => r.data),
}

export const vendorCategoriesApi = {
  list: () =>
    api.get<VendorCategory[]>('/vendor-categories').then((r) => r.data),
}
