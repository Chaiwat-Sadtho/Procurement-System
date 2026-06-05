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

export interface VendorPayload {
  name: string
  taxId: string | null
  email: string | null
  phone: string | null
  address: string | null
  categoryIds: number[]
}

// GET /vendors/:id/ratings — mapped history item (join po.poNumber + rater fullName)
export interface VendorRatingHistoryItem {
  id: number
  vendorId: number
  poId: number
  purchaseOrder: { id: number; poNumber: string }
  score: number
  comment: string | null
  ratedBy: { id: number; fullName: string }
  createdAt: string
}

export type VendorRatingsResponse = PaginatedResponse<VendorRatingHistoryItem>
