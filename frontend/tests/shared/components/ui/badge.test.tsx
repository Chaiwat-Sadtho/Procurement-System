import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/shared/components/ui/badge'

describe('Badge variants', () => {
  it('renders the default variant text', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('applies a green background for the success variant', () => {
    render(<Badge variant="success">Done</Badge>)
    const el = screen.getByText('Done')
    expect(el.className).toMatch(/bg-emerald-600/)
    expect(el.className).toMatch(/dark:bg-emerald-500/)
  })

  it('applies an amber background for the warning variant', () => {
    render(<Badge variant="warning">Partial</Badge>)
    const el = screen.getByText('Partial')
    expect(el.className).toMatch(/bg-amber-500/)
    expect(el.className).toMatch(/dark:bg-amber-400/)
  })
})
