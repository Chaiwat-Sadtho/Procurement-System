import type { PaginatedResponse } from '@/shared/types'

export type PRStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'

export interface PRUserRef {
  id: number
  fullName: string
  email: string
}

export interface PRItem {
  id: number
  prId: number
  itemName: string
  description: string | null
  quantity: number
  unit: string
  estimatedUnitPrice: string // decimal(15,2) → string (§4A: Number() ก่อนคำนวณ)
  estimatedTotalPrice: string // decimal → string
}

export interface PurchaseRequest {
  id: number
  prNumber: string
  title: string
  status: PRStatus
  totalEstimatedAmount: string // decimal → string
  quarter: number | null
  requiredDate: string
  requesterId: number
  requester: PRUserRef
  departmentId: number | null
  department: { id: number; name: string } | null
  approvedBy: number | null
  approver: PRUserRef | null
  approvedAt: string | null
  rejectReason: string | null
  items: PRItem[]
  createdAt: string
  updatedAt: string
}

export interface CreatePRItemRequest {
  itemName: string
  description?: string
  quantity: number
  unit: string
  estimatedUnitPrice: number
}

export interface CreatePRRequest {
  title: string
  requiredDate: string
  quarter: number | null
  items: CreatePRItemRequest[]
}

export type UpdatePRRequest = Partial<CreatePRRequest>

export type PRListResponse = PaginatedResponse<PurchaseRequest>

export interface PrStatsResponse {
  total: number
  draft: number
  submitted: number
  approved: number
  rejected: number
}
