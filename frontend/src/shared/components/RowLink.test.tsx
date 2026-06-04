import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { RowLink } from './RowLink'

describe('RowLink', () => {
  it('renders a real anchor to the detail route (keyboard + new-tab capable)', () => {
    render(
      <MemoryRouter>
        <RowLink to="/purchase-orders/9">PO-2026-0009</RowLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'PO-2026-0009' })).toHaveAttribute(
      'href',
      '/purchase-orders/9',
    )
  })

  it('stops click propagation so the row onClick does not double-navigate', async () => {
    const onRowClick = vi.fn()
    render(
      <MemoryRouter>
        <div onClick={onRowClick}>
          <RowLink to="/x/1">เปิด</RowLink>
        </div>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('link', { name: 'เปิด' }))
    expect(onRowClick).not.toHaveBeenCalled()
  })
})
