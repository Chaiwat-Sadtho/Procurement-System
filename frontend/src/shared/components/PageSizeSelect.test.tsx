import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageSizeSelect } from './PageSizeSelect'

describe('PageSizeSelect', () => {
  it('shows the current value on the trigger', () => {
    render(<PageSizeSelect value={10} onChange={() => {}} />)
    expect(screen.getByLabelText('จำนวนแถวต่อหน้า')).toHaveTextContent('10')
  })

  it('opens and lists all page-size options', async () => {
    render(<PageSizeSelect value={5} onChange={() => {}} />)
    await userEvent.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    for (const n of [5, 10, 20, 50]) {
      expect(await screen.findByRole('option', { name: String(n) })).toBeInTheDocument()
    }
  })

  it('calls onChange with a number (not a string) when a new size is selected', async () => {
    const onChange = vi.fn()
    render(<PageSizeSelect value={5} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('จำนวนแถวต่อหน้า'))
    await userEvent.click(await screen.findByRole('option', { name: '20' }))
    expect(onChange).toHaveBeenCalledWith(20)
    expect(typeof onChange.mock.calls[0][0]).toBe('number')
  })
})
