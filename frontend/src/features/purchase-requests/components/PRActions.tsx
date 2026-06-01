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
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      {canSubmit && (
        <Button className="w-full sm:w-auto" onClick={onSubmit}>
          ส่งขออนุมัติ
        </Button>
      )}
      {canDecide && (
        <>
          <Button className="w-full sm:w-auto" onClick={onApprove}>
            อนุมัติ
          </Button>
          <Button variant="destructive" className="w-full sm:w-auto" onClick={onReject}>
            ปฏิเสธ
          </Button>
        </>
      )}
    </div>
  )
}
