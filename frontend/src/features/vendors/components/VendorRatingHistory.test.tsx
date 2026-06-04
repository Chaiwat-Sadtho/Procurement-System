import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { VendorRatingsResponse } from '../types'

const mockUseVendorRatings = vi.fn()
vi.mock('../hooks/useVendorRatings', () => ({ useVendorRatings: (...a: unknown[]) => mockUseVendorRatings(...a) }))

import { VendorRatingHistory } from './VendorRatingHistory'

const row = {
  id: 1, vendorId: 3, poId: 7,
  purchaseOrder: { id: 7, poNumber: 'PO-2026-0007' },
  score: 4, comment: 'ดี',
  ratedBy: { id: 2, fullName: 'สมชาย ใจดี' },
  createdAt: '2026-06-01T00:00:00Z',
}
const oneRow = { data: [row], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } as VendorRatingsResponse

function renderHistory() {
  return render(
    <MemoryRouter>
      <VendorRatingHistory vendorId={3} />
    </MemoryRouter>,
  )
}

describe('VendorRatingHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a rating row with PO link + rater', () => {
    mockUseVendorRatings.mockReturnValue({ data: oneRow, isLoading: false, isError: false, refetch: vi.fn() })
    renderHistory()
    expect(screen.getByLabelText('คะแนน 4 จาก 5')).toBeInTheDocument()
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PO-2026-0007' })).toHaveAttribute('href', '/purchase-orders/7')
  })

  it('shows the empty message when there are no ratings', () => {
    mockUseVendorRatings.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false, isError: false, refetch: vi.fn(),
    })
    renderHistory()
    expect(screen.getByText('ยังไม่มีการให้คะแนน')).toBeInTheDocument()
  })

  it('shows the error state with retry', () => {
    const refetch = vi.fn()
    mockUseVendorRatings.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('x'), refetch })
    renderHistory()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('advances the page when clicking next', async () => {
    const user = userEvent.setup()
    mockUseVendorRatings.mockReturnValue({
      data: { data: [row], meta: { page: 1, limit: 20, total: 25, totalPages: 3 } },
      isLoading: false, isError: false, refetch: vi.fn(),
    })
    renderHistory()
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }))
    // หลังคลิก hook ถูกเรียกซ้ำด้วย page: 2
    expect(mockUseVendorRatings).toHaveBeenLastCalledWith(3, { page: 2, limit: 20 })
  })
})
