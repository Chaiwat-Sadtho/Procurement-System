import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GrnStatusBadge } from '@/features/goods-receipts/components/GrnStatusBadge'

describe('GrnStatusBadge', () => {
  it('renders partial as รับไม่ครบ with the warning variant', () => {
    render(<GrnStatusBadge status="partial" />)
    const el = screen.getByText('รับไม่ครบ')
    expect(el).toBeInTheDocument()
    expect(el.className).toMatch(/bg-amber-500/)
  })

  it('renders complete as รับครบถ้วน with the success variant', () => {
    render(<GrnStatusBadge status="complete" />)
    const el = screen.getByText('รับครบถ้วน')
    expect(el).toBeInTheDocument()
    expect(el.className).toMatch(/bg-emerald-600/)
  })
})
