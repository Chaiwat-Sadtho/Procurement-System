import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCards } from './StatCards'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

const stats: PrStatsResponse = { total: 10, draft: 2, submitted: 3, approved: 4, rejected: 1 }

describe('StatCards', () => {
  it('shows skeletons when loading', () => {
    render(<StatCards stats={undefined} isLoading role="employee" />)
    expect(screen.getByTestId('stat-cards-loading')).toBeInTheDocument()
  })

  it('employee: shows Draft/Submitted/Approved/Rejected values', () => {
    render(<StatCards stats={stats} isLoading={false} role="employee" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // draft
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })

  it('manager: shows Total card', () => {
    render(<StatCards stats={stats} isLoading={false} role="manager" />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('procurement_officer: shows Total + Pending cards', () => {
    render(<StatCards stats={stats} isLoading={false} role="procurement_officer" />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('undefined role: falls back to employee cards', () => {
    render(<StatCards stats={stats} isLoading={false} role={undefined} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })
})
