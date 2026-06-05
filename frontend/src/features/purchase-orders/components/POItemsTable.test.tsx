import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatCurrency } from '@/shared/lib/utils'
import type { POItem } from '../types'
import { POItemsTable } from './POItemsTable'

const items: POItem[] = [
  {
    id: 201,
    poId: 1,
    prItemId: 11,
    itemName: 'A4 Paper',
    quantity: '10',
    unit: 'reams',
    unitPrice: '150',
    totalPrice: '1500',
    receivedQuantity: '4',
  },
  {
    id: 202,
    poId: 1,
    prItemId: null,
    itemName: 'Ballpoint Pen',
    quantity: '24',
    unit: 'pcs',
    unitPrice: '12.5',
    totalPrice: '300',
    receivedQuantity: '0',
  },
]

describe('POItemsTable', () => {
  it('renders one row per item with itemName visible', () => {
    render(<POItemsTable items={items} totalAmount={1800} />)
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    expect(screen.getByText('Ballpoint Pen')).toBeInTheDocument()
  })

  it('formats unit price and total price as THB currency (string decimals coerced)', () => {
    render(<POItemsTable items={items} totalAmount={1800} />)
    expect(screen.getByText(formatCurrency(150))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(1500))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(12.5))).toBeInTheDocument()
  })

  it('shows received over quantity text per row', () => {
    render(<POItemsTable items={items} totalAmount={1800} />)
    expect(screen.getByText('4 / 10')).toBeInTheDocument()
    expect(screen.getByText('0 / 24')).toBeInTheDocument()
  })

  it('renders a progress bar with percent value derived from received/quantity', () => {
    const { container } = render(<POItemsTable items={items} totalAmount={1800} />)
    const bars = container.querySelectorAll('[role="progressbar"]')
    expect(bars).toHaveLength(2)
    // 4/10 = 40
    expect(bars[0].getAttribute('aria-valuenow')).toBe('40')
    // 0/24 = 0
    expect(bars[1].getAttribute('aria-valuenow')).toBe('0')
  })

  it('displays totalAmount as currency in the footer', () => {
    render(<POItemsTable items={items} totalAmount={1800} />)
    expect(screen.getByText(`รวม: ${formatCurrency(1800)}`)).toBeInTheDocument()
  })

  it('styles the table header with the shared table-header theme', () => {
    const { container } = render(<POItemsTable items={items} totalAmount={1800} />)
    const thead = container.querySelector('thead')
    expect(thead).toHaveClass('bg-table-header')
    expect(thead).toHaveClass('text-table-header-foreground')
  })
})
