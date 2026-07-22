import type { PaginationParams, PaginatedResponse } from '@/shared/types'

// partial = not everything received yet, complete = fully received
export type GrnStatus = 'partial' | 'complete'

export type ItemCondition = 'good' | 'damaged'

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
  receivedQuantity: string // decimal(10,2) → string
  condition: ItemCondition
}

// GET /goods-receipts/:id — full detail
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
  receivedByUser?: { id: number; fullName: string }
  receivedDate: string // 'YYYY-MM-DD'
  status: GrnStatus
  notes: string | null
  items: GoodsReceiptItem[]
  createdAt: string
}

// GET /goods-receipts list row — items are joined so the list can show a count
export interface GoodsReceiptListItem {
  id: number
  grnNumber: string
  poId: number
  purchaseOrder?: { id: number; poNumber: string }
  receivedBy: number
  receivedDate: string
  status: GrnStatus
  notes: string | null
  items: { id: number }[] // length only — rendered as the line count
  createdAt: string
}

// PO picker option: the subset of GET /purchase-orders?receivable=true that the Combobox needs
export interface ReceivablePO {
  id: number
  poNumber: string // 'PO-YYYY-NNNN'
  vendor?: { id: number; name: string }
  status: string // 'acknowledged' | 'partially_received'
}

// POST /goods-receipts body — quantities are numbers here, not strings
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
