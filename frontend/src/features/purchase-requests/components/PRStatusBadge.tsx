import { Badge } from '@/shared/components/ui/badge'
import type { PRStatus } from '../types'

const statusConfig: Record<
  PRStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  under_review: { label: 'Under Review', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

interface PRStatusBadgeProps {
  status: PRStatus
}

export function PRStatusBadge({ status }: PRStatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
