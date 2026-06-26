import { ActionButtons, type ActionButton } from '@/shared/components/ActionButtons'
import type { User } from '@/shared/types'
import type { PurchaseOrder } from '../types'

interface POActionsProps {
  po: PurchaseOrder
  user: User
  onEdit: () => void
  onSend: () => void
  onAcknowledge: () => void
  onCancel: () => void
}

export function POActions({ po, user, onEdit, onSend, onAcknowledge, onCancel }: POActionsProps) {
  if (user.role !== 'procurement_officer') return null

  const buttons: ActionButton[] = []

  if (po.status === 'draft') {
    buttons.push({ key: 'edit', label: 'แก้ไข', variant: 'outline', onClick: onEdit })
    buttons.push({ key: 'send', label: 'ส่ง', onClick: onSend })
  }
  if (po.status === 'sent') {
    buttons.push({ key: 'ack', label: 'รับทราบ', onClick: onAcknowledge })
  }
  if (
    po.status === 'draft' ||
    po.status === 'sent' ||
    po.status === 'acknowledged' ||
    po.status === 'partially_received'
  ) {
    buttons.push({ key: 'cancel', label: 'ยกเลิก', variant: 'destructive', onClick: onCancel })
  }

  return <ActionButtons buttons={buttons} />
}
