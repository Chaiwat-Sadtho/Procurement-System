import type { PaginatedResponse } from '@/shared/types'

export interface VendorCategory {
  id: number
  name: string
}

export interface Vendor {
  id: number
  name: string
  taxId: string | null
  email: string | null
  phone: string | null
  address: string | null
  isBlacklisted: boolean
  blacklistReason: string | null
  ratingAvg: string | null // decimal → serialize เป็น string (ต้อง Number() ก่อนแสดง)
  categories: VendorCategory[]
  createdAt: string
  updatedAt: string
}

export interface VendorListParams {
  page?: number
  limit?: number
  search?: string
  isBlacklisted?: boolean
  categoryId?: number
}

export type VendorListResponse = PaginatedResponse<Vendor>
