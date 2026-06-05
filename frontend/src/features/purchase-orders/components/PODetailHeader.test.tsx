import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/utils'
import type { PurchaseOrder } from '../types'
import { PODetailHeader } from './PODetailHeader'

const basePO: PurchaseOrder = {
  id: 1,
  poNumber: 'PO-2026-0001',
  prId: 5,
  purchaseRequest: {
    id: 5,
    prNumber: 'PR-2026-0009',
    quarter: 1,
    fiscalYear: 2026,
    departmentId: 3,
    department: { id: 3, name: 'IT' },
    totalEstimatedAmount: '1500',
  },
  vendorId: 7,
  vendor: { id: 7, name: 'Acme Co', isBlacklisted: false },
  createdBy: 10,
  createdByUser: { id: 10, fullName: 'Officer One', email: 'o@x.com' },
  status: 'draft',
  totalAmount: '1800',
  expectedDeliveryDate: '2026-03-01',
  actualDeliveryDate: null,
  notes: null,
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderHeader(po: Partial<PurchaseOrder> = {}, actions?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <PODetailHeader po={{ ...basePO, ...po }} actions={actions} />
    </MemoryRouter>,
  )
}

describe('PODetailHeader', () => {
  it('renders poNumber, vendor name and the status badge', () => {
    renderHeader()
    expect(screen.getByText('PO-2026-0001')).toBeInTheDocument()
    expect(screen.getAllByText('Acme Co').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
  })

  it('links to the source PR and the vendor', () => {
    renderHeader()
    const prLink = screen.getByRole('link', { name: 'PR-2026-0009' })
    expect(prLink).toHaveAttribute('href', '/purchase-requests/5')
    const vendorLink = screen.getByRole('link', { name: 'Acme Co' })
    expect(vendorLink).toHaveAttribute('href', '/vendors/7')
  })

  it('shows creator and total amount (string coerced)', () => {
    renderHeader()
    expect(screen.getByText('Officer One')).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(1800))).toBeInTheDocument()
  })

  it('shows a dash for actualDeliveryDate when null', () => {
    renderHeader()
    expect(screen.getByText('วันที่รับจริง').nextSibling?.textContent).toBe('-')
  })

  it('renders notes when present', () => {
    renderHeader({ notes: 'ส่งด่วน' })
    expect(screen.getByText('ส่งด่วน')).toBeInTheDocument()
  })

  it('renders the actions slot', () => {
    renderHeader({}, <button>SLOT-ACTION</button>)
    expect(screen.getByRole('button', { name: 'SLOT-ACTION' })).toBeInTheDocument()
  })
})
