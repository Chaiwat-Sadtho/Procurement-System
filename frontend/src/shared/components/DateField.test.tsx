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

  it('พิมพ์เดือนเกิน 12 จนครบ → แจ้งเตือนกรอกวันที่ให้ถูกต้อง + emit ว่าง', async () => {
    const onChange = vi.fn()
    render(<DateField id="d" value="" onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '01132569')
    expect(screen.getByText('กรุณากรอกวันที่ให้ถูกต้อง')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('พิมพ์วันที่ครบและถูกต้อง → ไม่แจ้งเตือน', async () => {
    render(<DateField id="d" value="" onChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '15032569')
    expect(screen.queryByText('กรุณากรอกวันที่ให้ถูกต้อง')).not.toBeInTheDocument()
  })

  it('พิมพ์ยังไม่ครบ (เดือนเกินแต่ยังไม่ครบ 8 หลัก) → ยังไม่แจ้งเตือน (ไม่ nag ระหว่างพิมพ์)', async () => {
    render(<DateField id="d" value="" onChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '0113')
    expect(screen.queryByText('กรุณากรอกวันที่ให้ถูกต้อง')).not.toBeInTheDocument()
  })

  it('แสดงข้อความ error จาก form (prop) เมื่อผู้ใช้ยังไม่ได้พิมพ์ผิดเอง', () => {
    render(<DateField id="d" value="" onChange={vi.fn()} error="กรุณาเลือกวันที่เริ่มต้น" />)
    expect(screen.getByText('กรุณาเลือกวันที่เริ่มต้น')).toBeInTheDocument()
  })
})
