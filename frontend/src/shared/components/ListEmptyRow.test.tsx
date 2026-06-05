import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableBody } from './ui/table'
import { ListEmptyRow } from './ListEmptyRow'

describe('ListEmptyRow', () => {
  it('announces the empty state via a polite status region with the default message', () => {
    render(
      <Table>
        <TableBody>
          <ListEmptyRow colSpan={5} />
        </TableBody>
      </Table>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('ไม่พบข้อมูลตามเงื่อนไข')
  })

  it('spans the given number of columns and accepts a custom message', () => {
    render(
      <Table>
        <TableBody>
          <ListEmptyRow colSpan={3} message="ยังไม่มีข้อมูล" />
        </TableBody>
      </Table>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('ยังไม่มีข้อมูล')
    expect(screen.getByRole('cell')).toHaveAttribute('colspan', '3')
  })
})
