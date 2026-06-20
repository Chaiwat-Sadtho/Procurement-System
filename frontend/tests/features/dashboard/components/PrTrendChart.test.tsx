import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-apexcharts', () => ({
  default: ({ type, series }: { type: string; series: { data: number[] }[] }) => (
    <div data-testid="apex-area" data-type={type} data-series={JSON.stringify(series)} />
  ),
}))

import { PrTrendChart } from '@/features/dashboard/components/PrTrendChart'
import type { TrendPoint } from '@/features/dashboard/api'

const data: TrendPoint[] = [
  { month: '2026-05', count: 3 },
  { month: '2026-06', count: 7 },
]

describe('PrTrendChart', () => {
  it('renders an area series of monthly counts', () => {
    render(<PrTrendChart data={data} isLoading={false} />)
    const el = screen.getByTestId('apex-area')
    expect(el).toHaveAttribute('data-type', 'area')
    expect(el).toHaveAttribute('data-series', JSON.stringify([{ name: 'จำนวน PR', data: [3, 7] }]))
  })

  it('shows skeleton while loading', () => {
    render(<PrTrendChart data={undefined} isLoading />)
    expect(screen.getByTestId('pr-trend-loading')).toBeInTheDocument()
  })
})
