import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateField } from './DateField'

describe('DateField', () => {
  it('พิมพ์ พ.ศ. ครบ → emit ISO ค.ศ. + แสดง DD/MM/YYYY', async () => {
    const onChange = vi.fn()
    render(<DateField id="d" value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText('วว/ดด/ปปปป')
    await userEvent.type(input, '01012569')
    expect(input).toHaveValue('01/01/2569')
    expect(onChange).toHaveBeenLastCalledWith('2026-01-01')
  })

  it('พิมพ์ปีเกิน 4 หลัก → ถูกตัด (#4)', async () => {
    const onChange = vi.fn()
    render(<DateField id="d" value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText('วว/ดด/ปปปป')
    await userEvent.type(input, '0101256999')
    expect(input).toHaveValue('01/01/2569')
    expect(onChange).toHaveBeenLastCalledWith('2026-01-01')
  })

  it('วันที่ผิด → emit ว่าง', async () => {
    const onChange = vi.fn()
    render(<DateField id="d" value="" onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '32012569')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('value เริ่มต้น (ISO) → แสดงเป็น พ.ศ.', () => {
    render(<DateField id="d" value="2026-12-31" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('วว/ดด/ปปปป')).toHaveValue('31/12/2569')
  })

  it('value เปลี่ยนจากภายนอกเป็นว่าง (reset) → ล้าง input', () => {
    const { rerender } = render(<DateField id="d" value="2026-12-31" onChange={vi.fn()} />)
    rerender(<DateField id="d" value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('วว/ดด/ปปปป')).toHaveValue('')
  })

  it('เลือกวันจากปฏิทิน → emit ISO', async () => {
    const onChange = vi.fn()
    render(<DateField id="d" value="2026-12-31" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'เปิดปฏิทิน' }))
    const grid = await screen.findByRole('grid')
    await userEvent.click(within(grid).getByText('15'))
    expect(onChange).toHaveBeenLastCalledWith('2026-12-15')
  })
})
