import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatCurrency } from '@/shared/lib/utils'
import type { PRItem } from '../types'
import { PRItemsTable } from './PRItemsTable'

const mockItems: PRItem[] = [
  {
    id: 101,
    prId: 1,
    itemName: 'A4 Paper',
    description: 'Double A 80 GSM',
    quantity: 10,
    unit: 'reams',
    estimatedUnitPrice: 150,
    estimatedTotalPrice: 1500,
  },
  {
    id: 102,
    prId: 1,
    itemName: 'Ballpoint Pen',
    description: null,
    quantity: 24,
    unit: 'pcs',
    estimatedUnitPrice: 12.5,
    estimatedTotalPrice: 300,
  },
]

describe('PRItemsTable', () => {
  it('renders one row per item with itemName visible', () => {
    render(<PRItemsTable items={mockItems} totalEstimatedAmount={1800} />)

    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    expect(screen.getByText('Ballpoint Pen')).toBeInTheDocument()
  })

  it('shows description text when item.description is provided', () => {
    render(<PRItemsTable items={mockItems} totalEstimatedAmount={1800} />)

    expect(screen.getByText('Double A 80 GSM')).toBeInTheDocument()
  })

  it('does not render description text when item.description is null', () => {
    render(
      <PRItemsTable
        items={[
          {
            id: 1,
            prId: 1,
            itemName: 'OnlyName',
            description: null,
            quantity: 1,
            unit: 'pcs',
            estimatedUnitPrice: 0,
            estimatedTotalPrice: 0,
          },
        ]}
        totalEstimatedAmount={0}
      />,
    )

    expect(screen.queryByText('null')).not.toBeInTheDocument()
    expect(screen.queryByText('Double A 80 GSM')).not.toBeInTheDocument()
  })

  it('formats unit price and total price as THB currency', () => {
    render(<PRItemsTable items={mockItems} totalEstimatedAmount={1800} />)

    expect(screen.getByText(formatCurrency(150))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(1500))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(12.5))).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(300))).toBeInTheDocument()
  })

  it('displays totalEstimatedAmount as currency in the footer', () => {
    render(<PRItemsTable items={mockItems} totalEstimatedAmount={1800} />)

    expect(screen.getByText(`รวม: ${formatCurrency(1800)}`)).toBeInTheDocument()
  })

  it('styles the table header with the shared table-header theme (matches PR list)', () => {
    const { container } = render(<PRItemsTable items={mockItems} totalEstimatedAmount={1800} />)
    const thead = container.querySelector('thead')
    expect(thead).toHaveClass('bg-table-header')
    expect(thead).toHaveClass('text-table-header-foreground')
  })
})
