import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListErrorState } from '@/shared/components/ListErrorState'

describe('ListErrorState', () => {
  it('announces the error assertively via an alert region', () => {
    render(<ListErrorState message="โหลดข้อมูลไม่สำเร็จ" onRetry={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดข้อมูลไม่สำเร็จ')
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ListErrorState message="x" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
