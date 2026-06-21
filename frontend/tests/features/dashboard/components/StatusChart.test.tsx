import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-apexcharts', () => ({
  default: ({ type, series }: { type: string; series: number[] }) => (
    <div data-testid="apex-donut" data-type={type} data-series={JSON.stringify(series)} />
  ),
}))

import { StatusChart } from '@/features/dashboard/components/StatusChart'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

const stats: PrStatsResponse = { total: 10, draft: 2, submitted: 3, approved: 4, rejected: 1 }

describe('StatusChart', () => {
  it('renders an ApexCharts donut with status counts as series', () => {
    render(<StatusChart stats={stats} isLoading={false} />)
    const donut = screen.getByTestId('apex-donut')
    expect(donut).toHaveAttribute('data-type', 'donut')
    expect(donut).toHaveAttribute('data-series', '[2,3,4,1]')
  })

  it('renders legend with each status label and count', () => {
    render(<StatusChart stats={stats} isLoading={false} />)
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
    expect(screen.getByText('รออนุมัติ')).toBeInTheDocument()
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument()
    expect(screen.getByText('ไม่อนุมัติ')).toBeInTheDocument()
    expect(screen.getByTestId('legend-approved')).toHaveTextContent('4')
  })

  it('shows skeleton when loading', () => {
    render(<StatusChart stats={undefined} isLoading />)
    expect(screen.getByTestId('status-chart-loading')).toBeInTheDocument()
  })

  it('shows skeleton when stats is missing even if not loading', () => {
    render(<StatusChart stats={undefined} isLoading={false} />)
    expect(screen.getByTestId('status-chart-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('status-chart-body')).not.toBeInTheDocument()
  })

  it('centers the donut + legend within the card', () => {
    render(<StatusChart stats={stats} isLoading={false} />)
    expect(screen.getByTestId('status-chart-body')).toHaveClass('justify-center')
  })
})
