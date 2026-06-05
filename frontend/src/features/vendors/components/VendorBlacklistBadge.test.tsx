import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VendorBlacklistBadge } from './VendorBlacklistBadge'

describe('VendorBlacklistBadge', () => {
  it('renders blacklisted state: destructive variant + label + icon', () => {
    const { container } = render(<VendorBlacklistBadge isBlacklisted={true} />)
    const badge = screen.getByText(/แบล็คลิสต์/)
    expect(badge).toHaveClass('bg-destructive')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders normal state: secondary variant + label + icon', () => {
    const { container } = render(<VendorBlacklistBadge isBlacklisted={false} />)
    const badge = screen.getByText(/ปกติ/)
    expect(badge).toHaveClass('bg-secondary')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
