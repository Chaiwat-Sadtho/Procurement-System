import { ActionButtons, type ActionButton } from '@/shared/components/ActionButtons'
import type { User } from '@/shared/types'
import type { PurchaseRequest } from '../types'

interface PRActionsProps {
  pr: PurchaseRequest
  user: User
  onSubmit: () => void
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
  onDelete: () => void
}

export function PRActions({
  pr,
  user,
  onSubmit,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: PRActionsProps) {
  const canSubmit = user.role === 'employee' && user.id === pr.requesterId && pr.status === 'draft'
  const canDecide = user.role === 'manager' && pr.status === 'submitted'

  const buttons: ActionButton[] = []
  if (canSubmit) {
    buttons.push({ key: 'edit', label: 'แก้ไข', variant: 'outline', onClick: onEdit })
    buttons.push({ key: 'delete', label: 'ลบร่าง', variant: 'destructive', onClick: onDelete })
    buttons.push({ key: 'submit', label: 'ส่งขออนุมัติ', onClick: onSubmit })
  }
  if (canDecide) {
    buttons.push({ key: 'approve', label: 'อนุมัติ', onClick: onApprove })
    buttons.push({ key: 'reject', label: 'ปฏิเสธ', variant: 'destructive', onClick: onReject })
  }

  return <ActionButtons buttons={buttons} />
}
