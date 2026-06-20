import type { ApexOptions } from 'apexcharts'
import { ApexChart } from '@/shared/components/ApexChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrency } from '@/shared/lib/utils'
import type { SpendByDept } from '../api'

interface SpendByDeptChartProps {
  data: SpendByDept[] | undefined
  isLoading: boolean
}

export function SpendByDeptChart({ data, isLoading }: SpendByDeptChartProps) {
  return (
    <Card data-testid="spend-by-dept-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ยอดใช้จ่ายตามแผนก (อนุมัติ ปีนี้)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton data-testid="spend-by-dept-loading" className="h-64 w-full" />
        ) : data.length === 0 ? (
          <p data-testid="spend-by-dept-empty" className="text-sm text-muted-foreground">
            ยังไม่มีข้อมูลการใช้จ่าย
          </p>
        ) : (
          <ApexChart
            type="bar"
            height={Math.max(180, data.length * 44)}
            series={[{ name: 'ยอดใช้จ่าย', data: data.map((d) => d.total) }]}
            options={
              {
                colors: ['#0369A1'],
                plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
                xaxis: {
                  categories: data.map((d) => d.departmentName),
                  labels: { formatter: (v: string) => formatCurrency(Number(v)) },
                },
                tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
              } as ApexOptions
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
