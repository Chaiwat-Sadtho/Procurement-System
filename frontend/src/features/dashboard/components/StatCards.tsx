import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { Role } from '@/shared/types'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

type StatKey = keyof PrStatsResponse

const CARDS_BY_ROLE: Record<Role, { key: StatKey; label: string }[]> = {
  employee: [
    { key: 'draft', label: 'Draft' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ],
  manager: [
    { key: 'total', label: 'Total' },
    { key: 'submitted', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ],
  procurement_officer: [
    { key: 'total', label: 'Total' },
    { key: 'submitted', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ],
}

interface StatCardsProps {
  stats: PrStatsResponse | undefined
  isLoading: boolean
  role: Role | undefined
}

export function StatCards({ stats, isLoading, role }: StatCardsProps) {
  const cards = CARDS_BY_ROLE[role ?? 'employee']

  if (isLoading) {
    return (
      <div data-testid="stat-cards-loading" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Skeleton key={c.key} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div data-testid="stat-cards" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.key} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.[c.key] ?? 0}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
