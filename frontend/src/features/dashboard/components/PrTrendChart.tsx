import type { ApexOptions } from 'apexcharts'
import { ApexChart } from '@/shared/components/ApexChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { TrendPoint } from '../api'

const TH_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

// '2026-06' -> 'มิ.ย. 69' (Thai short month + 2-digit BE year)
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${TH_MONTHS[m - 1]} ${String((y + 543) % 100).padStart(2, '0')}`
}

interface PrTrendChartProps {
  data: TrendPoint[] | undefined
  isLoading: boolean
}

export function PrTrendChart({ data, isLoading }: PrTrendChartProps) {
  return (
    <Card data-testid="pr-trend-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">จำนวน PR รายเดือน (12 เดือนล่าสุด)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton data-testid="pr-trend-loading" className="h-64 w-full" />
        ) : (
          <ApexChart
            type="area"
            height={260}
            series={[{ name: 'จำนวน PR', data: data.map((d) => d.count) }]}
            options={
              {
                colors: ['#0369A1'],
                stroke: { curve: 'smooth', width: 2 },
                fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
                xaxis: { categories: data.map((d) => monthLabel(d.month)) },
                yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
              } as ApexOptions
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
