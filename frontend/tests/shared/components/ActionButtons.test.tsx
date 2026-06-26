import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionButtons } from '@/shared/components/ActionButtons'

describe('ActionButtons', () => {
  it('renders nothing when buttons is empty', () => {
    const { container } = render(<ActionButtons buttons={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lays out a responsive 4-col track that stacks on mobile (default cols=4)', () => {
    const { container } = render(
      <ActionButtons
        buttons={[
          { key: 'a', label: 'ค้นหา' },
          { key: 'b', label: 'ล้าง' },
        ]}
      />,
    )
    const grid = container.querySelector('div')
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-4')
  })

  it('right-aligns the cluster: each button gets an explicit sm:col-start (n=2, cols=4 -> 3,4)', () => {
    render(
      <ActionButtons
        buttons={[
          { key: 'a', label: 'ค้นหา' },
          { key: 'b', label: 'ล้าง' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'ค้นหา' })).toHaveClass('w-full', 'sm:col-start-3')
    expect(screen.getByRole('button', { name: 'ล้าง' })).toHaveClass('w-full', 'sm:col-start-4')
  })

  it('right-aligns 3 buttons (cols=4 -> 2,3,4)', () => {
    render(
      <ActionButtons
        buttons={[
          { key: 'a', label: 'แก้ไข' },
          { key: 'b', label: 'ลบ' },
          { key: 'c', label: 'ส่ง' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'แก้ไข' })).toHaveClass('sm:col-start-2')
    expect(screen.getByRole('button', { name: 'ลบ' })).toHaveClass('sm:col-start-3')
    expect(screen.getByRole('button', { name: 'ส่ง' })).toHaveClass('sm:col-start-4')
  })

  it('cols=2 fills full width (n=2 -> 1,2) for dialog footers', () => {
    const { container } = render(
      <ActionButtons
        cols={2}
        buttons={[
          { key: 'a', label: 'ยกเลิก' },
          { key: 'b', label: 'ยืนยัน' },
        ]}
      />,
    )
    expect(container.querySelector('div')).toHaveClass('sm:grid-cols-2')
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toHaveClass('sm:col-start-1')
    expect(screen.getByRole('button', { name: 'ยืนยัน' })).toHaveClass('sm:col-start-2')
  })

  it('fires onClick, forwards disabled, defaults type=button and supports submit', async () => {
    const onClick = vi.fn()
    render(
      <ActionButtons
        buttons={[
          { key: 'a', label: 'กด', onClick },
          { key: 'b', label: 'ปิด', disabled: true },
          { key: 'c', label: 'ส่งฟอร์ม', type: 'submit' },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'กด' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'กด' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'ปิด' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'ส่งฟอร์ม' })).toHaveAttribute('type', 'submit')
  })
})
