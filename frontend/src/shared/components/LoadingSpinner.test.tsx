import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('exposes a busy status region that announces loading and forwards the testId', () => {
    render(<LoadingSpinner testId="x-spinner" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('กำลังโหลด')
    expect(status).toHaveAttribute('data-testid', 'x-spinner')
  })

  it('announces a custom label', () => {
    render(<LoadingSpinner label="กำลังโหลดใบสั่งซื้อ" />)
    expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดใบสั่งซื้อ')
  })

  it('renders a single decorative (aria-hidden) spinning glyph', () => {
    render(<LoadingSpinner />)
    const status = screen.getByRole('status')
    const hidden = status.querySelectorAll('[aria-hidden="true"]')
    expect(hidden).toHaveLength(1)
    expect(hidden[0]).toHaveClass('animate-spin')
  })

  it('merges a custom className onto the wrapper while keeping the centering base', () => {
    render(<LoadingSpinner className="min-h-screen" />)
    const status = screen.getByRole('status')
    expect(status).toHaveClass('min-h-screen')
    expect(status).toHaveClass('items-center')
  })
})
