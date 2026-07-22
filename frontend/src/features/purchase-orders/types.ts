import type { PaginationParams, PaginatedResponse } from '@/shared/types'

// Mirrors the backend PoStatus enum; partially_received/completed are driven by the GRN module
export type PoStatus =
  | 'draft'
  | 'sent'
  | 'acknowledged'
  | 'partially_received'
  | 'completed'
  | 'cancelled'

export interface POUserRef {
  id: number
  fullName: string
  email: string
}

export interface PODeptRef {
  id: number
  name: string
}

// Refs joined onto the PO detail — only the fields the UI displays
export interface POVendorRef {
  id: number
  name: string
  isBlacklisted: boolean
}

export interface POPrRef {
  id: number
  prNumber: string
  quarter: number | null
  fiscalYear: number | null
  departmentId: number | null
  department: PODeptRef | null
  totalEstimatedAmount: string // decimal → string (Number() ก่อนคำนวณ)
}

export interface POItem {
  id: number
  poId: number
  prItemId: number | null
  itemName: string
  quantity: string // decimal(10,2) → string
  unit: string
  unitPrice: string // decimal(15,2) → string
  totalPrice: string // server-computed decimal(15,2) → string
  receivedQuantity: string // decimal(10,2) default 0 → string
}

export interface PurchaseOrder {
  id: number
  poNumber: string // 'PO-YYYY-NNNN'
  prId: number
  purchaseRequest?: POPrRef
  vendorId: number
  vendor?: POVendorRef
  createdBy: number
  createdByUser?: POUserRef
  status: PoStatus
  totalAmount: string // decimal(15,2) → string
  expectedDeliveryDate: string // 'YYYY-MM-DD'
  actualDeliveryDate: string | null // null until completed
  notes: string | null
  items: POItem[]
  createdAt: string
  updatedAt: string
}

export interface POListParams extends PaginationParams {
  status?: PoStatus
  vendorId?: number
  prId?: number
}

export type POListResponse = PaginatedResponse<PurchaseOrder>

// Read-only GRN history: GET /purchase-orders/:id/goods-receipts returns a bare array with items joined
export interface GoodsReceiptItemSummary {
  id: number
  grnId: number
  poItemId: number
  receivedQuantity: string // decimal(10,2) → string
  condition: 'good' | 'damaged'
}

export interface GoodsReceiptSummary {
  id: number
  grnNumber: string // 'GRN-YYYY-NNNN'
  poId: number
  receivedBy: number
  receivedDate: string // 'YYYY-MM-DD'
  status: 'partial' | 'complete'
  notes: string | null
  items: GoodsReceiptItemSummary[]
  createdAt: string
}

// POST /purchase-orders body
export interface CreatePOItemRequest {
  prItemId?: number
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
}

export interface CreatePORequest {
  prId: number
  vendorId: number
  expectedDeliveryDate: string
  notes?: string
  items: CreatePOItemRequest[]
}

// PATCH body (draft POs only): prId/vendorId are immutable, and notes accepts null to clear it
export type UpdatePORequest = Partial<Omit<CreatePORequest, 'prId' | 'vendorId' | 'notes'>> & {
  notes?: string | null
}

// GET /purchase-orders/:id/rating — the raw rating row, null while the PO is unrated
export interface VendorRating {
  id: number
  vendorId: number
  poId: number
  score: number
  comment: string | null
  ratedBy: number
  createdAt: string
}

// POST /purchase-orders/:id/ratings body
export interface RateVendorPayload {
  score: number
  comment?: string
}
