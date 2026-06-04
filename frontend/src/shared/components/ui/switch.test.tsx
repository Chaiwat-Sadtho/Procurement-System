import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './switch'

describe('Switch', () => {
  it('exposes role=switch and reflects checked via aria-checked', () => {
    const { rerender } = render(<Switch checked={false} aria-label="x" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    rerender(<Switch checked aria-label="x" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('click fires onCheckedChange with the toggled value', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="x" />)
    await user.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('keyboard Space and Enter toggle (native button activation)', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch checked onCheckedChange={onCheckedChange} aria-label="x" />)
    const sw = screen.getByRole('switch')
    sw.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, false)
  })

  it('disabled uses the native disabled attribute and does not fire onCheckedChange', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch checked={false} disabled onCheckedChange={onCheckedChange} aria-label="x" />)
    const sw = screen.getByRole('switch')
    expect(sw).toBeDisabled()
    await user.click(sw)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
