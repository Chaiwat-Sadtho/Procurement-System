import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/shared/components/ui/switch'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import type { User } from '@/shared/types'
import { usersErrorMessage } from '../lib/usersErrorMessage'
import { useUserMutations } from '../hooks/useUserMutations'

interface UserStatusToggleProps {
  user: User
  disabled?: boolean
  disabledReason?: string
}

export function UserStatusToggle({ user, disabled, disabledReason }: UserStatusToggleProps) {
  const { updateStatusMutation } = useUserMutations()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const displayName = user.fullName.trim() || user.email

  const doMutate = (isActive: boolean) => {
    updateStatusMutation.mutate(
      { id: user.id, isActive },
      {
        onSuccess: () => {
          toast.success(isActive ? 'เปิดการใช้งานแล้ว' : 'ปิดการใช้งานแล้ว')
          setConfirmOpen(false)
        },
        onError: (e) => {
          toast.error(usersErrorMessage(e))
          setConfirmOpen(false)
        },
      },
    )
  }

  const handleChange = (next: boolean) => {
    if (next) {
      doMutate(true) // activating is non-destructive → no confirm (spec D3)
    } else {
      setConfirmOpen(true) // deactivating → confirm first
    }
  }

  return (
    <div className="space-y-1">
      <Switch
        checked={user.isActive}
        onCheckedChange={handleChange}
        disabled={disabled || updateStatusMutation.isPending}
        aria-label={`สถานะการใช้งานของ ${displayName}`}
      />

      {disabled && disabledReason && (
        <span className="block text-xs text-muted-foreground">{disabledReason}</span>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="ยืนยันปิดการใช้งาน"
        description={`ปิดการใช้งานบัญชีของ ${displayName} จะทำให้ผู้ใช้นี้เข้าสู่ระบบไม่ได้`}
        confirmLabel="ปิดการใช้งาน"
        variant="destructive"
        onConfirm={() => doMutate(false)}
        isPending={updateStatusMutation.isPending}
      />
    </div>
  )
}
