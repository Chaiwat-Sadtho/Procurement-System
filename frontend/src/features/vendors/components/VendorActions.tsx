import { ActionButtons, type ActionButton } from '@/shared/components/ActionButtons'
import type { User } from '@/shared/types'
import type { Vendor } from '../types'

interface VendorActionsProps {
  vendor: Vendor
  user: User
  onEdit: () => void
  onBlacklist: () => void
  onUnblacklist: () => void
}

export function VendorActions({
  vendor,
  user,
  onEdit,
  onBlacklist,
  onUnblacklist,
}: VendorActionsProps) {
  if (user.role !== 'procurement_officer') return null

  const buttons: ActionButton[] = [
    { key: 'edit', label: 'แก้ไข', variant: 'outline', onClick: onEdit },
  ]
  if (vendor.isBlacklisted) {
    buttons.push({
      key: 'unblacklist',
      label: 'ยกเลิกแบล็คลิสต์',
      variant: 'outline',
      onClick: onUnblacklist,
    })
  } else {
    buttons.push({
      key: 'blacklist',
      label: 'แบล็คลิสต์',
      variant: 'destructive',
      onClick: onBlacklist,
    })
  }

  return <ActionButtons buttons={buttons} />
}
