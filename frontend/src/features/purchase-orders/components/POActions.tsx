import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
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

type ActionButton = {
  key: string
  label: string
  variant?: 'default' | 'outline' | 'destructive'
  onClick: () => void
}

// equal-col span on a 12-col grid: 1->12, 2->6, 3->4, 4->3
const SPAN_BY_COUNT: Record<number, string> = {
  1: 'col-span-12',
  2: 'col-span-6',
  3: 'col-span-4',
  4: 'col-span-3',
}

export function POActions({ po, user, onEdit, onSend, onAcknowledge, onCancel }: POActionsProps) {
  if (user.role !== 'procurement_officer') return null

  const buttons: ActionButton[] = []

  if (po.status === 'draft') {
    buttons.push({ key: 'edit', label: 'แก้ไข', variant: 'outline', onClick: onEdit })
    buttons.push({ key: 'send', label: 'ส่ง', variant: 'default', onClick: onSend })
  }
  if (po.status === 'sent') {
    buttons.push({ key: 'ack', label: 'รับทราบ', variant: 'default', onClick: onAcknowledge })
  }
  if (
    po.status === 'draft' ||
    po.status === 'sent' ||
    po.status === 'acknowledged' ||
    po.status === 'partially_received'
  ) {
    buttons.push({ key: 'cancel', label: 'ยกเลิก', variant: 'destructive', onClick: onCancel })
  }

  if (buttons.length === 0) return null

  const span = SPAN_BY_COUNT[buttons.length] ?? 'col-span-12'

  return (
    <div className="grid grid-cols-12 gap-2">
      {buttons.map((b) => (
        <Button key={b.key} variant={b.variant} className={cn('w-full', span)} onClick={b.onClick}>
          {b.label}
        </Button>
      ))}
    </div>
  )
}
