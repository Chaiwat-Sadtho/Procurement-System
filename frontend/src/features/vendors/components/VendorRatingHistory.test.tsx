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
    expect(screen.getByText('(4/5)')).toBeInTheDocument()
    expect(screen.getByText('ดี')).toBeInTheDocument()
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PO-2026-0007' })).toHaveAttribute('href', '/purchase-orders/7')
  })

  it('renders every rating row, showing a dash for an empty comment', () => {
    const rows = [
      row,
      { ...row, id: 2, score: 5, comment: null, poId: 8, purchaseOrder: { id: 8, poNumber: 'PO-2026-0008' } },
    ]
    mockUseVendorRatings.mockReturnValue({
      data: { data: rows, meta: { page: 1, limit: 20, total: 2, totalPages: 1 } },
      isLoading: false, isError: false, refetch: vi.fn(),
    })
    renderHistory()
    expect(screen.getByText('(4/5)')).toBeInTheDocument()
    expect(screen.getByText('(5/5)')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PO-2026-0008' })).toBeInTheDocument()
  })

  it('shows the loading state while fetching', () => {
    mockUseVendorRatings.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })
    renderHistory()
    expect(screen.getByTestId('vendor-rating-history-loading')).toBeInTheDocument()
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

  it('goes back a page when clicking prev', async () => {
    const user = userEvent.setup()
    mockUseVendorRatings.mockReturnValue({
      data: { data: [row], meta: { page: 1, limit: 20, total: 25, totalPages: 3 } },
      isLoading: false, isError: false, refetch: vi.fn(),
    })
    renderHistory()
    // prev ถูก disable ตอน page 1 -> ต้องไปหน้า 2 ก่อนแล้วถอยกลับ
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }))
    await user.click(screen.getByRole('button', { name: 'ก่อนหน้า' }))
    expect(mockUseVendorRatings).toHaveBeenLastCalledWith(3, { page: 1, limit: 20 })
  })

  it('resets to page 1 when the page size changes', async () => {
    const user = userEvent.setup()
    mockUseVendorRatings.mockReturnValue({
      data: { data: [row], meta: { page: 1, limit: 20, total: 100, totalPages: 5 } },
      isLoading: false, isError: false, refetch: vi.fn(),
    })
    renderHistory()
    await user.click(screen.getByRole('button', { name: 'ถัดไป' })) // page -> 2
    expect(mockUseVendorRatings).toHaveBeenLastCalledWith(3, { page: 2, limit: 20 })
    await user.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    await user.click(await screen.findByRole('option', { name: '50' }))
    // เปลี่ยน limit ต้องเด้ง page กลับ 1
    expect(mockUseVendorRatings).toHaveBeenLastCalledWith(3, { page: 1, limit: 50 })
  })
})
