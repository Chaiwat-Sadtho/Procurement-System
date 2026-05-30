import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RequiredMark } from './RequiredMark'

describe('RequiredMark', () => {
  it('renders asterisk text', () => {
    render(<RequiredMark />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('has aria-label "จำเป็น" and text-destructive class', () => {
    render(<RequiredMark />)
    const mark = screen.getByLabelText('จำเป็น')
    expect(mark).toHaveTextContent('*')
    expect(mark).toHaveClass('text-destructive')
  })
})
