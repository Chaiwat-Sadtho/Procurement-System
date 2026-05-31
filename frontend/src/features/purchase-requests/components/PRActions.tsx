import { Button } from '@/shared/components/ui/button'
import type { User } from '@/shared/types'
import type { PurchaseRequest } from '../types'

interface PRActionsProps {
  pr: PurchaseRequest
  user: User
  onSubmit: () => void
  onApprove: () => void
  onReject: () => void
}

export function PRActions({ pr, user, onSubmit, onApprove, onReject }: PRActionsProps) {
  const canSubmit = user.role === 'employee' && user.id === pr.requesterId && pr.status === 'draft'
  const canDecide = user.role === 'manager' && pr.status === 'submitted'

  if (!canSubmit && !canDecide) return null

  return (
    <div className="flex gap-2">
      {canSubmit && <Button onClick={onSubmit}>ส่งขออนุมัติ</Button>}
      {canDecide && (
        <>
          <Button onClick={onApprove}>อนุมัติ</Button>
          <Button variant="destructive" onClick={onReject}>
            ปฏิเสธ
          </Button>
        </>
      )}
    </div>
  )
}
