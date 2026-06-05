import { Badge } from '@/shared/components/ui/badge'
import type { ItemCondition } from '../types'

const conditionConfig: Record<
  ItemCondition,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  }
> = {
  good: { label: 'สภาพดี', variant: 'success' },
  damaged: { label: 'ชำรุด', variant: 'destructive' },
}

interface GrnConditionBadgeProps {
  condition: ItemCondition
}

export function GrnConditionBadge({ condition }: GrnConditionBadgeProps) {
  const config = conditionConfig[condition]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
