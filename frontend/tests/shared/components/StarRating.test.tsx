import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating } from '@/shared/components/StarRating'

describe('StarRating', () => {
  it('readOnly: renders an accessible label with the score', () => {
    render(<StarRating value={4} readOnly />)
    expect(screen.getByLabelText('คะแนน 4 จาก 5')).toBeInTheDocument()
  })

  it('readOnly: is not interactive (no radiogroup)', () => {
    render(<StarRating value={3} readOnly />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('interactive: clicking a star calls onChange with that value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: '4 ดาว' }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('interactive: marks the selected star aria-checked', () => {
    render(<StarRating value={2} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '2 ดาว' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '3 ดาว' })).toHaveAttribute('aria-checked', 'false')
  })

  it('interactive: ArrowRight increments selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)
    const star = screen.getByRole('radio', { name: '2 ดาว' })
    star.focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('interactive: ArrowLeft decrements selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={3} onChange={onChange} />)
    const star = screen.getByRole('radio', { name: '3 ดาว' })
    star.focus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('interactive: ArrowRight does not exceed max', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={5} onChange={onChange} />)
    const star = screen.getByRole('radio', { name: '5 ดาว' })
    star.focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('interactive: ArrowLeft does not go below 1', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={1} onChange={onChange} />)
    const star = screen.getByRole('radio', { name: '1 ดาว' })
    star.focus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('interactive: hovering a star previews the fill up to it', async () => {
    const user = userEvent.setup()
    render(<StarRating value={0} onChange={vi.fn()} />)
    await user.hover(screen.getByRole('radio', { name: '3 ดาว' }))
    expect(screen.getByRole('radio', { name: '3 ดาว' }).querySelector('svg')).toHaveClass(
      'fill-amber-400',
    )
    expect(screen.getByRole('radio', { name: '4 ดาว' }).querySelector('svg')).not.toHaveClass(
      'fill-amber-400',
    )
  })
})
