import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-apexcharts', () => ({
  default: ({ type, series }: { type: string; series: { data: number[] }[] }) => (
    <div data-testid="apex-bar" data-type={type} data-series={JSON.stringify(series)} />
  ),
}))

import { SpendByDeptChart } from '@/features/dashboard/components/SpendByDeptChart'
import type { SpendByDept } from '@/features/dashboard/api'

const data: SpendByDept[] = [
  { departmentId: 2, departmentName: 'Finance', total: 3000 },
  { departmentId: 1, departmentName: 'IT', total: 1000 },
]

describe('SpendByDeptChart', () => {
  it('renders a bar series of department totals', () => {
    render(<SpendByDeptChart data={data} isLoading={false} />)
    const el = screen.getByTestId('apex-bar')
    expect(el).toHaveAttribute('data-type', 'bar')
    expect(el).toHaveAttribute(
      'data-series',
      JSON.stringify([{ name: 'ยอดใช้จ่าย', data: [3000, 1000] }]),
    )
  })

  it('shows skeleton while loading', () => {
    render(<SpendByDeptChart data={undefined} isLoading />)
    expect(screen.getByTestId('spend-by-dept-loading')).toBeInTheDocument()
  })

  it('shows empty state when no approved spend', () => {
    render(<SpendByDeptChart data={[]} isLoading={false} />)
    expect(screen.getByTestId('spend-by-dept-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('apex-bar')).not.toBeInTheDocument()
  })
})
