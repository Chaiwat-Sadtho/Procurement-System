import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AttentionList } from './AttentionList'
import type { PrStatsResponse } from '@/features/purchase-requests/types'

function renderWith(stats: PrStatsResponse) {
  return render(<MemoryRouter><AttentionList stats={stats} /></MemoryRouter>)
}
const base: PrStatsResponse = { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 }

describe('AttentionList', () => {
  it('hidden entirely when draft=0 and rejected=0', () => {
    renderWith(base)
    expect(screen.queryByTestId('attention-list')).not.toBeInTheDocument()
  })

  it('shows only draft row when rejected=0', () => {
    renderWith({ ...base, draft: 3 })
    expect(screen.getByText(/Draft รอส่ง/)).toBeInTheDocument()
    expect(screen.queryByText(/Rejected รอแก้/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Draft รอส่ง/ })).toHaveAttribute('href', '/purchase-requests?status=draft')
  })

  it('shows both rows with correct links and counts', () => {
    renderWith({ ...base, draft: 2, rejected: 5 })
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(5\)/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rejected รอแก้/ })).toHaveAttribute('href', '/purchase-requests?status=rejected')
  })
})
