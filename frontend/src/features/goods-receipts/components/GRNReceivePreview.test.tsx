import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GRNReceivePreview } from './GRNReceivePreview'

describe('GRNReceivePreview', () => {
  it('shows รับครบถ้วน in green and announces it as a status when every line good >= remaining', () => {
    render(
      <GRNReceivePreview
        items={[
          { remaining: 6, good: 6 },
          { remaining: 3, good: 3 },
        ]}
      />,
    )
    const outcome = screen.getByTestId('grn-receive-outcome')
    expect(outcome).toHaveTextContent(/รับครบถ้วน/)
    expect(outcome).toHaveTextContent(/PO completed/)
    // complete = emerald (pins visual intent; a colour swap would slip past a text-only assertion)
    expect(outcome.className).toMatch(/text-emerald-600/)
    // outcome changes live as the user edits quantities -> must be announced to screen readers
    expect(outcome).toHaveAttribute('role', 'status')
    expect(outcome).toHaveAttribute('aria-live', 'polite')
  })

  it('treats good greater than remaining as complete (boundary >=)', () => {
    render(<GRNReceivePreview items={[{ remaining: 5, good: 5 }]} />)
    expect(screen.getByText(/รับครบถ้วน/)).toBeInTheDocument()
  })

  it('shows รับไม่ครบ in amber when any line still has remaining (good < remaining)', () => {
    render(
      <GRNReceivePreview
        items={[
          { remaining: 6, good: 6 },
          { remaining: 3, good: 2 },
        ]}
      />,
    )
    const outcome = screen.getByTestId('grn-receive-outcome')
    expect(outcome).toHaveTextContent(/รับไม่ครบ/)
    expect(outcome).toHaveTextContent(/partially_received/)
    expect(outcome.className).toMatch(/text-amber-600/)
  })

  it('exactly-at-boundary one short is partial', () => {
    render(<GRNReceivePreview items={[{ remaining: 5, good: 4.99 }]} />)
    expect(screen.getByText(/รับไม่ครบ/)).toBeInTheDocument()
  })

  it('empty items renders รับไม่ครบ (nothing received)', () => {
    render(<GRNReceivePreview items={[]} />)
    expect(screen.getByText(/รับไม่ครบ/)).toBeInTheDocument()
  })
})
