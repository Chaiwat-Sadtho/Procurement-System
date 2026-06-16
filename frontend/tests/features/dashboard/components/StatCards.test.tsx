import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCards } from '@/features/dashboard/components/StatCards'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

const stats: PrStatsResponse = { total: 10, draft: 2, submitted: 3, approved: 4, rejected: 1 }

describe('StatCards', () => {
  it('shows skeletons when loading', () => {
    render(<StatCards stats={undefined} isLoading role="employee" />)
    expect(screen.getByTestId('stat-cards-loading')).toBeInTheDocument()
  })

  it('employee: shows Draft/Submitted/Approved/Rejected values', () => {
    render(<StatCards stats={stats} isLoading={false} role="employee" />)
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // draft
    expect(screen.queryByText('ทั้งหมด')).not.toBeInTheDocument()
  })

  it('manager: shows Total card', () => {
    render(<StatCards stats={stats} isLoading={false} role="manager" />)
    expect(screen.getByText('ทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('procurement_officer: shows Total + Pending cards', () => {
    render(<StatCards stats={stats} isLoading={false} role="procurement_officer" />)
    expect(screen.getByText('ทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('รออนุมัติ')).toBeInTheDocument()
    expect(screen.queryByText('ฉบับร่าง')).not.toBeInTheDocument()
  })

  it('undefined role: falls back to employee cards', () => {
    render(<StatCards stats={stats} isLoading={false} role={undefined} />)
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
    expect(screen.queryByText('ทั้งหมด')).not.toBeInTheDocument()
  })
})
