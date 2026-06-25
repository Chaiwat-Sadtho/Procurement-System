import {
  Bell,
  ClipboardCheck,
  ClipboardX,
  ClipboardList,
  FileText,
  PackageCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationType } from '../types'

const ICONS: Record<NotificationType, LucideIcon> = {
  pr_submitted: ClipboardList,
  pr_approved: ClipboardCheck,
  pr_rejected: ClipboardX,
  po_created: FileText,
  po_acknowledged: FileText,
  grn_created: PackageCheck,
  budget_warning: Wallet,
}

export function getNotificationIcon(type: NotificationType): LucideIcon {
  return ICONS[type] ?? Bell
}

const ROUTE_BY_REFERENCE: Record<string, string> = {
  PurchaseRequest: '/purchase-requests',
  PurchaseOrder: '/purchase-orders',
  GoodsReceiptNote: '/goods-receipts',
  Budget: '/budgets',
}

export function getNotificationLink(
  referenceType: string | null,
  referenceId: number | null,
): string | null {
  if (!referenceType || referenceId == null) return null
  const base = ROUTE_BY_REFERENCE[referenceType]
  return base ? `${base}/${referenceId}` : null
}
