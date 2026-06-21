import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-apexcharts', () => ({
  default: ({ type, series, options }: { type: string; series: unknown; options: unknown }) => (
    <div
      data-testid="apexchart"
      data-type={type}
      data-series={JSON.stringify(series)}
      data-toolbar={String((options as { chart?: { toolbar?: { show?: boolean } } }).chart?.toolbar?.show)}
    />
  ),
}))

import { ApexChart } from '@/shared/components/ApexChart'

describe('ApexChart', () => {
  it('passes type and series through to the chart', () => {
    render(<ApexChart type="donut" series={[1, 2, 3]} />)
    const el = screen.getByTestId('apexchart')
    expect(el).toHaveAttribute('data-type', 'donut')
    expect(el).toHaveAttribute('data-series', '[1,2,3]')
  })

  it('disables the toolbar by default', () => {
    render(<ApexChart type="area" series={[{ name: 'x', data: [1] }]} />)
    expect(screen.getByTestId('apexchart')).toHaveAttribute('data-toolbar', 'false')
  })

  it('lets caller options override base (e.g. colors)', () => {
    render(<ApexChart type="bar" series={[{ name: 'x', data: [1] }]} options={{ colors: ['#0369A1'] }} />)
    expect(screen.getByTestId('apexchart')).toBeInTheDocument()
  })
})
