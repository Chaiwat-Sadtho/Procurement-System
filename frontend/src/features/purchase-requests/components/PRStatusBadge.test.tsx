import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PRStatusBadge } from './PRStatusBadge'

describe('PRStatusBadge', () => {
  it('renders draft status', () => {
    render(<PRStatusBadge status="draft" />)
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
  })

  it('renders submitted status', () => {
    render(<PRStatusBadge status="submitted" />)
    expect(screen.getByText('รออนุมัติ')).toBeInTheDocument()
  })

  it('renders under_review status', () => {
    render(<PRStatusBadge status="under_review" />)
    expect(screen.getByText('กำลังตรวจสอบ')).toBeInTheDocument()
  })

  it('renders approved status', () => {
    render(<PRStatusBadge status="approved" />)
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument()
  })

  it('renders rejected status', () => {
    render(<PRStatusBadge status="rejected" />)
    expect(screen.getByText('ไม่อนุมัติ')).toBeInTheDocument()
  })
})
