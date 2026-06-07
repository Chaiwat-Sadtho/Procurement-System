import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListSearchPrompt } from './ListSearchPrompt'

describe('ListSearchPrompt', () => {
  it('renders the given message inside a status live region', () => {
    render(<ListSearchPrompt message="กดค้นหาเพื่อแสดงผล" />)
    expect(screen.getByRole('status')).toHaveTextContent('กดค้นหาเพื่อแสดงผล')
  })

  it('applies data-testid when testId is provided', () => {
    render(<ListSearchPrompt message="x" testId="po-search-prompt" />)
    expect(screen.getByRole('status')).toHaveAttribute('data-testid', 'po-search-prompt')
  })

  it('omits data-testid when testId is not provided', () => {
    render(<ListSearchPrompt message="x" />)
    expect(screen.getByRole('status')).not.toHaveAttribute('data-testid')
  })
})
