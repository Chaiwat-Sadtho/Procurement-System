import { Badge } from '@/shared/components/ui/badge'
import type { PoStatus } from '../types'

const statusConfig: Record<
  PoStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  }
> = {
  draft: { label: 'ฉบับร่าง', variant: 'secondary' },
  sent: { label: 'ส่งแล้ว', variant: 'outline' },
  acknowledged: { label: 'รับทราบแล้ว', variant: 'default' },
  partially_received: { label: 'รับบางส่วน', variant: 'warning' },
  completed: { label: 'เสร็จสมบูรณ์', variant: 'success' },
  cancelled: { label: 'ยกเลิก', variant: 'destructive' },
}

interface POStatusBadgeProps {
  status: PoStatus
}

export function POStatusBadge({ status }: POStatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
