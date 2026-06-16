import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Progress } from '@/shared/components/ui/progress'

describe('Progress', () => {
  it('forwards value to the progressbar as aria-valuenow', () => {
    const { container } = render(<Progress value={40} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-valuenow')).toBe('40')
  })

  it('clamps values above 100', () => {
    const { container } = render(<Progress value={150} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar?.getAttribute('aria-valuenow')).toBe('100')
  })

  it('clamps values below 0', () => {
    const { container } = render(<Progress value={-20} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar?.getAttribute('aria-valuenow')).toBe('0')
  })

  it('treats a missing value as 0', () => {
    const { container } = render(<Progress />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar?.getAttribute('aria-valuenow')).toBe('0')
  })
})
