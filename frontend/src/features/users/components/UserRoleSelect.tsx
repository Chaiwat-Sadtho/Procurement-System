import { useState } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import type { Role, User } from '@/shared/types'
import { ROLE_LABELS, ROLE_OPTIONS } from '../lib/roleLabels'
import { usersErrorMessage } from '../lib/usersErrorMessage'
import { useUserMutations } from '../hooks/useUserMutations'

interface UserRoleSelectProps {
  user: User
  disabled?: boolean
  disabledReason?: string
}

export function UserRoleSelect({ user, disabled, disabledReason }: UserRoleSelectProps) {
  const { updateRoleMutation } = useUserMutations()
  // pendingRole is separate from `value` (which stays bound to user.role) so that
  // cancelling the confirm dialog leaves the trigger showing the original role.
  const [pendingRole, setPendingRole] = useState<Role | null>(null)
  const displayName = user.fullName.trim() || user.email

  const handleValueChange = (next: string) => {
    if (next === user.role) return
    setPendingRole(next as Role)
  }

  const handleConfirm = () => {
    if (!pendingRole) return
    updateRoleMutation.mutate(
      { id: user.id, role: pendingRole },
      {
        onSuccess: () => {
          toast.success('อัปเดตบทบาทแล้ว')
          setPendingRole(null)
        },
        onError: (e) => {
          toast.error(usersErrorMessage(e))
          setPendingRole(null)
        },
      },
    )
  }

  return (
    <div className="space-y-1">
      <Select
        value={user.role}
        onValueChange={handleValueChange}
        disabled={disabled || updateRoleMutation.isPending}
      >
        <SelectTrigger aria-label={`บทบาทของ ${displayName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {disabled && disabledReason && (
        <span className="text-xs text-muted-foreground">{disabledReason}</span>
      )}

      <ConfirmDialog
        open={pendingRole !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRole(null)
        }}
        title="ยืนยันเปลี่ยนบทบาท"
        description={
          pendingRole
            ? `เปลี่ยนบทบาทของ ${displayName} จาก ${ROLE_LABELS[user.role]} เป็น ${ROLE_LABELS[pendingRole]}`
            : undefined
        }
        confirmLabel="ยืนยัน"
        onConfirm={handleConfirm}
        isPending={updateRoleMutation.isPending}
      />
    </div>
  )
}
