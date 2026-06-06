import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GoodsReceiptSummary } from '../types'
import { POGrnHistory } from './POGrnHistory'

const grns: GoodsReceiptSummary[] = [
  {
    id: 31,
    grnNumber: 'GRN-2026-0001',
    poId: 1,
    receivedBy: 10,
    receivedDate: '2026-03-05',
    status: 'complete',
    notes: null,
    items: [
      { id: 1, grnId: 31, poItemId: 201, receivedQuantity: '4', condition: 'good' },
      { id: 2, grnId: 31, poItemId: 202, receivedQuantity: '6', condition: 'good' },
    ],
    createdAt: '2026-03-05T00:00:00Z',
  },
  {
    id: 32,
    grnNumber: 'GRN-2026-0002',
    poId: 1,
    receivedBy: 10,
    receivedDate: '2026-03-08',
    status: 'partial',
    notes: null,
    items: [{ id: 3, grnId: 32, poItemId: 201, receivedQuantity: '5', condition: 'good' }],
    createdAt: '2026-03-08T00:00:00Z',
  },
]

describe('POGrnHistory', () => {
  it('shows the empty message when there are no GRNs', () => {
    render(<POGrnHistory grns={[]} />)
    expect(screen.getByText('ยังไม่มีการรับของ')).toBeInTheDocument()
  })

  it('renders one row per GRN with number and item count', () => {
    render(<POGrnHistory grns={grns} />)
    expect(screen.getByText('GRN-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('GRN-2026-0002')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders Thai status badges instead of raw English status', () => {
    render(<POGrnHistory grns={grns} />)
    expect(screen.getByText('รับครบถ้วน')).toBeInTheDocument()
    expect(screen.getByText('รับไม่ครบ')).toBeInTheDocument()
    expect(screen.queryByText('complete')).not.toBeInTheDocument()
    expect(screen.queryByText('partial')).not.toBeInTheDocument()
  })

  it('does not render any links (read-only until GRN spec)', () => {
    render(<POGrnHistory grns={grns} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders the section heading', () => {
    render(<POGrnHistory grns={grns} />)
    expect(screen.getByText('ประวัติการรับของ (GRN)')).toBeInTheDocument()
  })
})
