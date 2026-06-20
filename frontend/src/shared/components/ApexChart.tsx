import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

type ChartType = 'donut' | 'area' | 'bar'

interface ApexChartProps {
  type: ChartType
  series: ApexAxisChartSeries | ApexNonAxisChartSeries
  options?: ApexOptions
  height?: number
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

// shallow-merge the nested option groups we control; everything else from caller passes through
function mergeOptions(base: ApexOptions, override: ApexOptions): ApexOptions {
  return {
    ...base,
    ...override,
    chart: { ...base.chart, ...override.chart },
    tooltip: { ...base.tooltip, ...override.tooltip },
    theme: { ...base.theme, ...override.theme },
    grid: { ...base.grid, ...override.grid },
    legend: { ...base.legend, ...override.legend },
  }
}

export function ApexChart({ type, series, options, height = 260 }: ApexChartProps) {
  const { resolvedTheme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'

  const base: ApexOptions = {
    chart: {
      fontFamily: '"IBM Plex Sans Thai", sans-serif',
      toolbar: { show: false },
      animations: { enabled: !reducedMotion },
      background: 'transparent',
    },
    theme: { mode },
    tooltip: { theme: mode },
    grid: { borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0' },
    legend: { fontFamily: '"IBM Plex Sans Thai", sans-serif' },
    dataLabels: { enabled: false },
  }

  return (
    <Chart type={type} series={series} options={mergeOptions(base, options ?? {})} height={height} />
  )
}
