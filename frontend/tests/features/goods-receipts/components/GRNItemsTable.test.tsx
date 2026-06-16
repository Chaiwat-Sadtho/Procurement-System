import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GoodsReceiptItem } from '@/features/goods-receipts/types'
import { GRNItemsTable } from '@/features/goods-receipts/components/GRNItemsTable'

const items: GoodsReceiptItem[] = [
  {
    id: 301,
    grnId: 1,
    poItemId: 11,
    poItem: { id: 11, itemName: 'A4 Paper', quantity: '10', unit: 'reams' },
    receivedQuantity: '6',
    condition: 'good',
  },
  {
    id: 302,
    grnId: 1,
    poItemId: 12,
    poItem: { id: 12, itemName: 'Ballpoint Pen', quantity: '24', unit: 'pcs' },
    receivedQuantity: '2',
    condition: 'damaged',
  },
]

describe('GRNItemsTable', () => {
  it('renders one row per item with the item name visible', () => {
    render(<GRNItemsTable items={items} />)
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    expect(screen.getByText('Ballpoint Pen')).toBeInTheDocument()
  })

  it('shows ordered quantity and received-this-time (string decimals coerced)', () => {
    render(<GRNItemsTable items={items} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders the condition badges with Thai labels', () => {
    render(<GRNItemsTable items={items} />)
    expect(screen.getByText('สภาพดี')).toBeInTheDocument()
    expect(screen.getByText('ชำรุด')).toBeInTheDocument()
  })

  it('styles the table header with the shared table-header theme', () => {
    const { container } = render(<GRNItemsTable items={items} />)
    const thead = container.querySelector('thead')
    expect(thead).toHaveClass('bg-table-header')
    expect(thead).toHaveClass('text-table-header-foreground')
  })

  it('falls back to a dash for item name and ordered qty when poItem is absent', () => {
    const orphan: GoodsReceiptItem[] = [
      {
        id: 399,
        grnId: 1,
        poItemId: 99,
        poItem: undefined,
        receivedQuantity: '3',
        condition: 'good',
      },
    ]
    render(<GRNItemsTable items={orphan} />)
    // both the name cell (`poItem?.itemName ?? '-'`) and the ordered-qty cell (`poItem ? ... : '-'`) fall back
    expect(screen.getAllByText('-')).toHaveLength(2)
    // received qty still renders from receivedQuantity even without poItem
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders only the header with no body rows when items is empty', () => {
    const { container } = render(<GRNItemsTable items={[]} />)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0)
  })
})
