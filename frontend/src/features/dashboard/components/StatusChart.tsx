import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

const SEGMENTS: { key: keyof PrStatsResponse; label: string; color: string }[] = [
  { key: 'draft', label: 'Draft', color: '#94a3b8' },
  { key: 'submitted', label: 'Submitted', color: '#3b6ea5' },
  { key: 'approved', label: 'Approved', color: '#16a34a' },
  { key: 'rejected', label: 'Rejected', color: '#dc2626' },
]

interface StatusChartProps {
  stats: PrStatsResponse | undefined
  isLoading: boolean
}

export function StatusChart({ stats, isLoading }: StatusChartProps) {
  return (
    <Card data-testid="status-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">สัดส่วนสถานะ PR</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !stats ? (
          <Skeleton data-testid="status-chart-loading" className="h-48 w-full" />
        ) : (
          <div data-testid="status-chart-body" className="flex items-center justify-center gap-8">
            <div className="h-52 w-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SEGMENTS.map((s) => ({ name: s.label, value: stats[s.key] }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                  >
                    {SEGMENTS.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-sm">
              {SEGMENTS.map((s) => (
                <li key={s.key} data-testid={`legend-${s.key}`} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="ml-auto font-medium">{stats[s.key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
