import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PRStatusBadge } from './PRStatusBadge'

describe('PRStatusBadge', () => {
  it('renders draft status', () => {
    render(<PRStatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders submitted status', () => {
    render(<PRStatusBadge status="submitted" />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('renders under_review status', () => {
    render(<PRStatusBadge status="under_review" />)
    expect(screen.getByText('Under Review')).toBeInTheDocument()
  })

  it('renders approved status', () => {
    render(<PRStatusBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders rejected status', () => {
    render(<PRStatusBadge status="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })
})
