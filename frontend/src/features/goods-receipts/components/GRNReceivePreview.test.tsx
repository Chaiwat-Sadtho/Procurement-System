import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GRNReceivePreview } from './GRNReceivePreview'

describe('GRNReceivePreview', () => {
  it('shows รับครบถ้วน when every line good >= remaining', () => {
    render(
      <GRNReceivePreview
        items={[
          { remaining: 6, good: 6 },
          { remaining: 3, good: 3 },
        ]}
      />,
    )
    expect(screen.getByText(/รับครบถ้วน/)).toBeInTheDocument()
    expect(screen.getByText(/PO completed/)).toBeInTheDocument()
  })

  it('treats good greater than remaining as complete (boundary >=)', () => {
    render(<GRNReceivePreview items={[{ remaining: 5, good: 5 }]} />)
    expect(screen.getByText(/รับครบถ้วน/)).toBeInTheDocument()
  })

  it('shows รับไม่ครบ when any line still has remaining (good < remaining)', () => {
    render(
      <GRNReceivePreview
        items={[
          { remaining: 6, good: 6 },
          { remaining: 3, good: 2 },
        ]}
      />,
    )
    expect(screen.getByText(/รับไม่ครบ/)).toBeInTheDocument()
    expect(screen.getByText(/partially_received/)).toBeInTheDocument()
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
