import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableHeader, TableRow, TableHead } from '@/shared/components/ui/table'

describe('TableHead', () => {
  it('renders a th with scope="col" so screen readers associate the column', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    )
    const th = screen.getByText('ชื่อ')
    expect(th.tagName).toBe('TH')
    expect(th).toHaveAttribute('scope', 'col')
  })

  it('lets callers override scope (e.g. row headers)', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="row">แถว</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    )
    expect(screen.getByText('แถว')).toHaveAttribute('scope', 'row')
  })
})
