import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { GoodsReceipt } from '@/features/goods-receipts/types'

vi.mock('@/features/goods-receipts/hooks/useGoodsReceipt', () => ({ useGoodsReceipt: vi.fn() }))

import { useGoodsReceipt } from '@/features/goods-receipts/hooks/useGoodsReceipt'
import { GRNDetailPage } from '@/features/goods-receipts/pages/GRNDetailPage'

const mockGrn: GoodsReceipt = {
  id: 1,
  grnNumber: 'GRN-2026-0001',
  poId: 5,
  purchaseOrder: { id: 5, poNumber: 'PO-2026-0005', status: 'completed' },
  receivedBy: 9,
  receivedByUser: { id: 9, fullName: 'Officer A' },
  receivedDate: '2026-06-01',
  status: 'complete',
  notes: 'ของครบ',
  items: [
    {
      id: 101,
      grnId: 1,
      poItemId: 201,
      poItem: { id: 201, itemName: 'A4 Paper', quantity: '10', unit: 'reams' },
      receivedQuantity: '10',
      condition: 'good',
    },
  ],
  createdAt: '2026-06-01T00:00:00Z',
}

function mockHook(overrides: Partial<Record<string, unknown>> = {}) {
  vi.mocked(useGoodsReceipt).mockReturnValue({
    data: mockGrn,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useGoodsReceipt>)
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/goods-receipts/${id}`]}>
      <Routes>
        <Route path="/goods-receipts/:id" element={<GRNDetailPage />} />
        <Route path="/goods-receipts" element={<div>LIST PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GRNDetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading skeleton while fetching', () => {
    mockHook({ data: undefined, isLoading: true })
    renderPage()
    expect(screen.getByTestId('grn-detail-loading')).toBeInTheDocument()
  })

  it('shows error alert with a back link when isError', () => {
    mockHook({ data: undefined, isError: true })
    renderPage()
    expect(screen.getByText(/ไม่พบใบรับของนี้/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับไปรายการ' })).toBeInTheDocument()
  })

  it('shows error alert for an invalid id', () => {
    mockHook({ data: undefined })
    renderPage('abc')
    expect(screen.getByText(/ไม่พบใบรับของนี้/)).toBeInTheDocument()
  })

  it('renders header (grn number + status badge) and items on success', () => {
    mockHook()
    renderPage()
    expect(screen.getByText('GRN-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('รับครบถ้วน')).toBeInTheDocument() // GrnStatusBadge complete
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
  })

  it('renders NO action buttons (GRN is immutable)', () => {
    mockHook()
    renderPage()
    expect(screen.queryByRole('button', { name: 'ส่ง' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ยกเลิก' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
  })

  it('passes the validated numeric id to the hook', () => {
    mockHook()
    renderPage('7')
    expect(vi.mocked(useGoodsReceipt)).toHaveBeenCalledWith(7)
  })
})
