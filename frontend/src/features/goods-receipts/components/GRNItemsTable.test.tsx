import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GoodsReceiptItem } from '../types'
import { GRNItemsTable } from './GRNItemsTable'

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
})
