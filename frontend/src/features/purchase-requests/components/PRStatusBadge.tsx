import { Badge } from '@/shared/components/ui/badge'
import type { PRStatus } from '../types'

const statusConfig: Record<
  PRStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }
> = {
  draft: { label: 'ฉบับร่าง', variant: 'secondary' },
  submitted: { label: 'รออนุมัติ', variant: 'default' },
  under_review: { label: 'กำลังตรวจสอบ', variant: 'outline' },
  approved: { label: 'อนุมัติแล้ว', variant: 'success' },
  rejected: { label: 'ไม่อนุมัติ', variant: 'destructive' },
}

interface PRStatusBadgeProps {
  status: PRStatus
}

export function PRStatusBadge({ status }: PRStatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
