import { Badge } from '@/shared/components/ui/badge'
import type { GrnStatus } from '../types'

const statusConfig: Record<
  GrnStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  }
> = {
  partial: { label: 'รับไม่ครบ', variant: 'warning' },
  complete: { label: 'รับครบถ้วน', variant: 'success' },
}

interface GrnStatusBadgeProps {
  status: GrnStatus
}

export function GrnStatusBadge({ status }: GrnStatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
