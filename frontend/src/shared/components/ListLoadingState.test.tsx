import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListLoadingState } from './ListLoadingState'

describe('ListLoadingState', () => {
  it('exposes a busy status region that announces loading and forwards the testId', () => {
    render(<ListLoadingState testId="x-list-loading" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('กำลังโหลด')
    expect(status).toHaveAttribute('data-testid', 'x-list-loading')
  })

  it('renders the requested number of decorative (aria-hidden) skeleton rows', () => {
    render(<ListLoadingState rows={3} />)
    const status = screen.getByRole('status')
    expect(status.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
  })

  it('renders 5 skeleton rows by default', () => {
    render(<ListLoadingState />)
    expect(screen.getByRole('status').querySelectorAll('[aria-hidden="true"]')).toHaveLength(5)
  })
})
