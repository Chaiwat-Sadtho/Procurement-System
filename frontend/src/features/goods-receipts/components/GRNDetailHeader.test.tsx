import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { formatDate } from '@/shared/lib/utils'
import type { GoodsReceipt } from '../types'
import { GRNDetailHeader } from './GRNDetailHeader'

const baseGrn: GoodsReceipt = {
  id: 1,
  grnNumber: 'GRN-2026-0001',
  poId: 7,
  purchaseOrder: { id: 7, poNumber: 'PO-2026-0007', status: 'partially_received' },
  receivedBy: 10,
  receivedByUser: { id: 10, fullName: 'Officer One' },
  receivedDate: '2026-02-15',
  status: 'partial',
  notes: null,
  items: [],
  createdAt: '2026-02-15T00:00:00Z',
}

function renderHeader(grn: Partial<GoodsReceipt> = {}) {
  return render(
    <MemoryRouter>
      <GRNDetailHeader grn={{ ...baseGrn, ...grn }} />
    </MemoryRouter>,
  )
}

describe('GRNDetailHeader', () => {
  it('renders grnNumber and the status badge', () => {
    renderHeader()
    expect(screen.getByText('GRN-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('รับไม่ครบ')).toBeInTheDocument()
  })

  it('links to the source PO detail', () => {
    renderHeader()
    const poLink = screen.getByRole('link', { name: 'PO-2026-0007' })
    expect(poLink).toHaveAttribute('href', '/purchase-orders/7')
  })

  it('has a back link to the goods-receipts list', () => {
    renderHeader()
    const back = screen.getByRole('link', { name: /กลับไปรายการ/ })
    expect(back).toHaveAttribute('href', '/goods-receipts')
  })

  it('shows the received date formatted and the receiver name', () => {
    renderHeader()
    expect(screen.getByText(formatDate('2026-02-15'))).toBeInTheDocument()
    expect(screen.getByText('Officer One')).toBeInTheDocument()
  })

  it('shows a dash for the receiver when receivedByUser is absent', () => {
    renderHeader({ receivedByUser: undefined })
    expect(screen.getByText('ผู้รับ').nextSibling?.textContent).toBe('-')
  })

  it('renders notes when present', () => {
    renderHeader({ notes: 'ของครบตามสั่ง' })
    expect(screen.getByText('ของครบตามสั่ง')).toBeInTheDocument()
  })

  it('falls back to #poId for the PO link when purchaseOrder is absent', () => {
    renderHeader({ purchaseOrder: undefined })
    const poLink = screen.getByRole('link', { name: '#7' })
    expect(poLink).toHaveAttribute('href', '/purchase-orders/7')
  })

  it('omits the notes paragraph when notes is null', () => {
    renderHeader({ notes: null })
    expect(screen.queryByText('ของครบตามสั่ง')).not.toBeInTheDocument()
  })
})
