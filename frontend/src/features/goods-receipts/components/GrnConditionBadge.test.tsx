import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GrnConditionBadge } from './GrnConditionBadge'

describe('GrnConditionBadge', () => {
  it('renders good as สภาพดี with the success variant', () => {
    render(<GrnConditionBadge condition="good" />)
    const el = screen.getByText('สภาพดี')
    expect(el).toBeInTheDocument()
    expect(el.className).toMatch(/bg-emerald-600/)
  })

  it('renders damaged as ชำรุด with the destructive variant', () => {
    render(<GrnConditionBadge condition="damaged" />)
    const el = screen.getByText('ชำรุด')
    expect(el).toBeInTheDocument()
    expect(el.className).toMatch(/bg-destructive/)
  })
})
