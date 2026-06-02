import api from '@/shared/lib/axios'
import type { VendorCategory, VendorListParams, VendorListResponse } from './types'

export const vendorsApi = {
  list: (params?: VendorListParams) =>
    api.get<VendorListResponse>('/vendors', { params }).then((r) => r.data),
}

export const vendorCategoriesApi = {
  list: () =>
    api.get<VendorCategory[]>('/vendor-categories').then((r) => r.data),
}
