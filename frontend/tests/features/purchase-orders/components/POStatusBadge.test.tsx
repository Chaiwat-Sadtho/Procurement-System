import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { POStatusBadge } from '@/features/purchase-orders/components/POStatusBadge'

describe('POStatusBadge', () => {
  it('renders draft as ฉบับร่าง', () => {
    render(<POStatusBadge status="draft" />)
    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument()
  })

  it('renders sent as ส่งแล้ว', () => {
    render(<POStatusBadge status="sent" />)
    expect(screen.getByText('ส่งแล้ว')).toBeInTheDocument()
  })

  it('renders acknowledged as รับทราบแล้ว', () => {
    render(<POStatusBadge status="acknowledged" />)
    expect(screen.getByText('รับทราบแล้ว')).toBeInTheDocument()
  })

  it('renders partially_received as รับบางส่วน with the warning variant', () => {
    render(<POStatusBadge status="partially_received" />)
    const el = screen.getByText('รับบางส่วน')
    expect(el.className).toMatch(/bg-amber-500/)
  })

  it('renders completed as เสร็จสมบูรณ์ with the success variant', () => {
    render(<POStatusBadge status="completed" />)
    const el = screen.getByText('เสร็จสมบูรณ์')
    expect(el.className).toMatch(/bg-emerald-600/)
  })

  it('renders cancelled as ยกเลิก with the destructive variant', () => {
    render(<POStatusBadge status="cancelled" />)
    const el = screen.getByText('ยกเลิก')
    expect(el.className).toMatch(/bg-destructive/)
  })
})
