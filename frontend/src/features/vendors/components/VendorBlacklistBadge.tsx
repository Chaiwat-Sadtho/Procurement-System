import { Ban, CircleCheck } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'

interface VendorBlacklistBadgeProps {
  isBlacklisted: boolean
}

export function VendorBlacklistBadge({ isBlacklisted }: VendorBlacklistBadgeProps) {
  if (isBlacklisted) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Ban className="h-3.5 w-3.5" />
        แบล็คลิสต์
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <CircleCheck className="h-3.5 w-3.5" />
      ปกติ
    </Badge>
  )
}
