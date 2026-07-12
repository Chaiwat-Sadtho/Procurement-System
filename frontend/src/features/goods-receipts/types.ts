import type { PaginationParams, PaginatedResponse } from '@/shared/types'

// GRN status (goods-receipt-note.entity.ts GrnStatus enum) — partial=รับไม่ครบ, complete=รับครบถ้วน (spec D3)
export type GrnStatus = 'partial' | 'complete'

// goods-receipt-item.entity.ts ItemCondition enum — good=สภาพดี, damaged=ชำรุด (spec D6)
export type ItemCondition = 'good' | 'damaged'

// GET /goods-receipts/:id items (relations: items.poItem) — receivedQuantity DECIMAL → string
export interface GoodsReceiptItem {
  id: number
  grnId: number
  poItemId: number
  poItem?: {
    id: number
    itemName: string
    quantity: string // decimal(10,2) → string
    unit: string
  }
  receivedQuantity: string // decimal(10,2) → string (Number() ก่อนคำนวณ)
  condition: ItemCondition
}

// GET /goods-receipts/:id (relations: items.poItem, purchaseOrder) — full detail
export interface GoodsReceipt {
  id: number
  grnNumber: string // 'GRN-YYYY-NNNN'
  poId: number
  purchaseOrder?: {
    id: number
    poNumber: string // 'PO-YYYY-NNNN'
    status: string
  }
  receivedBy: number
  receivedByUser?: { id: number; fullName: string } // only if backend serializes; treat optional
  receivedDate: string // 'YYYY-MM-DD'
  status: GrnStatus
  notes: string | null
  items: GoodsReceiptItem[]
  createdAt: string
}

// GET /goods-receipts list row (findAll relations: items, purchaseOrder) — items present for count
export interface GoodsReceiptListItem {
  id: number
  grnNumber: string
  poId: number
  purchaseOrder?: { id: number; poNumber: string }
  receivedBy: number
  receivedDate: string
  status: GrnStatus
  notes: string | null
  items: { id: number }[] // length = จำนวนรายการ (list col)
  createdAt: string
}

// PO picker option — GET /purchase-orders?receivable=true → {data:[],meta} mapped to array.
// Reuse PurchaseOrder shape from PO feature; this is the subset the Combobox needs.
export interface ReceivablePO {
  id: number
  poNumber: string // 'PO-YYYY-NNNN'
  vendor?: { id: number; name: string }
  status: string // 'acknowledged' | 'partially_received'
}

// POST /goods-receipts body — CreateGoodsReceiptDto + CreateGrnItemDto (numbers, not strings)
export interface CreateGoodsReceiptItem {
  poItemId: number
  receivedQuantity: number // @Min(0.01)
  condition: ItemCondition
}

export interface CreateGoodsReceiptPayload {
  poId: number
  receivedDate: string // @IsDateString 'YYYY-MM-DD'
  notes?: string
  items: CreateGoodsReceiptItem[] // @ArrayMinSize(1)
}

export interface GRNListParams extends PaginationParams {
  poId?: number
  status?: GrnStatus
}

export type GRNListResponse = PaginatedResponse<GoodsReceiptListItem>
