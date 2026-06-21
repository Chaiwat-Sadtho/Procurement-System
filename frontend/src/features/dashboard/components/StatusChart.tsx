import type { ApexOptions } from 'apexcharts'
import { ApexChart } from '@/shared/components/ApexChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

const SEGMENTS: { key: keyof PrStatsResponse; label: string; color: string }[] = [
  { key: 'draft', label: 'ฉบับร่าง', color: '#94a3b8' },
  { key: 'submitted', label: 'รออนุมัติ', color: '#3b6ea5' },
  { key: 'approved', label: 'อนุมัติแล้ว', color: '#16a34a' },
  { key: 'rejected', label: 'ไม่อนุมัติ', color: '#dc2626' },
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
          // donut อยู่กลางการ์ด (stack) + legend 2 คอลัมน์ใต้ donut
          <div
            data-testid="status-chart-body"
            className="flex flex-col items-center justify-center gap-4"
          >
            <div className="h-52 w-52">
              <ApexChart
                type="donut"
                height={208}
                series={SEGMENTS.map((s) => stats[s.key])}
                options={
                  {
                    labels: SEGMENTS.map((s) => s.label),
                    colors: SEGMENTS.map((s) => s.color),
                    legend: { show: false },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '62%',
                          labels: {
                            show: true,
                            total: {
                              show: true,
                              label: 'ทั้งหมด',
                              formatter: () => String(stats.total),
                            },
                          },
                        },
                      },
                    },
                  } as ApexOptions
                }
              />
            </div>
            <ul className="grid w-full max-w-xs grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {SEGMENTS.map((s) => (
                <li key={s.key} data-testid={`legend-${s.key}`} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
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
