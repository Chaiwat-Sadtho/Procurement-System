import type { PaginationParams, PaginatedResponse } from '@/shared/types'

// 6 สถานะตาม PoStatus enum (purchase-order.entity.ts) — partially_received/completed มาจาก GRN module
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

// vendor/PR refs ที่ join มากับ PO detail (subset ของ entity เต็ม — ใช้แค่ที่ FE ต้องโชว์)
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
  totalEstimatedAmount: string // decimal → string (§4A: Number() ก่อนคำนวณ)
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

// GRN history (read-only) — GET /purchase-orders/:id/goods-receipts = bare array (§4 D6),
// findByPo() join relations: { items: true } → items มากับ array.
// GoodsReceiptNote entity ไม่มี updatedAt (มีแค่ createdAt).
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

// POST /purchase-orders body (CreatePurchaseOrderDto + CreatePurchaseOrderItemDto)
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

// PATCH /purchase-orders/:id body (UpdatePurchaseOrderDto — draft only):
// แก้ได้เฉพาะ expectedDeliveryDate/notes/items (prId/vendorId immutable).
// Partial<Omit<...>> = { expectedDeliveryDate?, notes?, items? } = ตรง shape ของ UpdatePurchaseOrderDto เป๊ะ
export type UpdatePORequest = Partial<Omit<CreatePORequest, 'prId' | 'vendorId'>>
