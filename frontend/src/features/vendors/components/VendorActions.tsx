import { Button } from '@/shared/components/ui/button'
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

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" className="w-full sm:w-auto" onClick={onEdit}>
        แก้ไข
      </Button>
      {vendor.isBlacklisted ? (
        <Button variant="outline" className="w-full sm:w-auto" onClick={onUnblacklist}>
          ยกเลิกแบล็คลิสต์
        </Button>
      ) : (
        <Button variant="destructive" className="w-full sm:w-auto" onClick={onBlacklist}>
          แบล็คลิสต์
        </Button>
      )}
    </div>
  )
}
