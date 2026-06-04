import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { PurchaseOrder, VendorRating } from '../types'
import type { User } from '@/shared/types'

const mockRatingForPo = vi.fn()
const mockRate = { mutate: vi.fn(), isPending: false }
vi.mock('../hooks/useVendorRatingForPo', () => ({ useVendorRatingForPo: (...a: unknown[]) => mockRatingForPo(...a) }))
vi.mock('../hooks/useRateVendor', () => ({ useRateVendor: () => mockRate }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from 'sonner'
import { PORatingSection } from './PORatingSection'

function axiosErr(message: string) {
  const err = new AxiosError('req failed')
  err.response = { data: { message }, status: 409, statusText: '', headers: {}, config: {} as never }
  return err
}

const officer = { id: 2, role: 'procurement_officer' } as User
const manager = { id: 5, role: 'manager' } as User
const basePo = { id: 7, vendorId: 3, status: 'completed', vendor: { id: 3, name: 'บริษัท ก', isBlacklisted: false } } as PurchaseOrder
const rating = { id: 1, poId: 7, vendorId: 3, score: 4, comment: 'ดี', ratedBy: 2, createdAt: '2026-06-01T00:00:00Z' } as VendorRating

describe('PORatingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRatingForPo.mockReturnValue({ data: null, isLoading: false })
  })

  it('renders nothing when PO is not completed', () => {
    const { container } = render(<PORatingSection po={{ ...basePo, status: 'sent' }} user={officer} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a read-only rating when already rated', () => {
    mockRatingForPo.mockReturnValue({ data: rating, isLoading: false })
    render(<PORatingSection po={basePo} user={officer} />)
    expect(screen.getByLabelText('คะแนน 4 จาก 5')).toBeInTheDocument()
    expect(screen.getByText('ดี')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ให้คะแนนผู้ขาย' })).not.toBeInTheDocument()
  })

  it('shows the rate button for an officer when not yet rated', () => {
    render(<PORatingSection po={basePo} user={officer} />)
    expect(screen.getByRole('button', { name: 'ให้คะแนนผู้ขาย' })).toBeInTheDocument()
  })

  it('shows a note for a manager when not yet rated (no button)', () => {
    render(<PORatingSection po={basePo} user={manager} />)
    expect(screen.getByText('ยังไม่มีการให้คะแนนผู้ขาย')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ให้คะแนนผู้ขาย' })).not.toBeInTheDocument()
  })

  it('shows a loading skeleton while the rating is fetching', () => {
    mockRatingForPo.mockReturnValue({ data: null, isLoading: true })
    render(<PORatingSection po={basePo} user={officer} />)
    expect(screen.getByTestId('po-rating-loading')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ให้คะแนนผู้ขาย' })).not.toBeInTheDocument()
  })

  it('shows the fallback text when a rated comment is null', () => {
    mockRatingForPo.mockReturnValue({ data: { ...rating, comment: null }, isLoading: false })
    render(<PORatingSection po={basePo} user={officer} />)
    expect(screen.getByText('ไม่มีความคิดเห็น')).toBeInTheDocument()
  })

  it('on success shows a toast and closes the dialog', async () => {
    const user = userEvent.setup()
    mockRate.mutate.mockImplementation((_p: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    render(<PORatingSection po={basePo} user={officer} />)
    await user.click(screen.getByRole('button', { name: 'ให้คะแนนผู้ขาย' }))
    await user.click(screen.getByRole('radio', { name: '4 ดาว' }))
    await user.click(screen.getByRole('button', { name: 'บันทึกคะแนน' }))
    expect(mockRate.mutate).toHaveBeenCalledWith({ score: 4 }, expect.anything())
    expect(toast.success).toHaveBeenCalledWith('บันทึกคะแนนแล้ว')
    expect(screen.queryByText('ให้คะแนนผู้ขาย: บริษัท ก')).not.toBeInTheDocument()
  })

  it('on error surfaces the Thai-mapped message and closes the dialog', async () => {
    const user = userEvent.setup()
    mockRate.mutate.mockImplementation((_p: unknown, opts: { onError: (e: unknown) => void }) =>
      opts.onError(axiosErr('This Purchase Order has already been rated')),
    )
    render(<PORatingSection po={basePo} user={officer} />)
    await user.click(screen.getByRole('button', { name: 'ให้คะแนนผู้ขาย' }))
    await user.click(screen.getByRole('radio', { name: '4 ดาว' }))
    await user.click(screen.getByRole('button', { name: 'บันทึกคะแนน' }))
    expect(toast.error).toHaveBeenCalledWith('ใบสั่งซื้อนี้ให้คะแนนไปแล้ว')
    expect(screen.queryByText('ให้คะแนนผู้ขาย: บริษัท ก')).not.toBeInTheDocument()
  })
})
