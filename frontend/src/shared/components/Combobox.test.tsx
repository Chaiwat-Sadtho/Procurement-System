import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox } from './Combobox'

const options = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '5', label: 'Alice' },
  { value: '6', label: 'Bob' },
]

describe('Combobox', () => {
  it('แสดง placeholder เมื่อยังไม่เลือก', () => {
    render(<Combobox value="" onChange={vi.fn()} options={options} placeholder="ทั้งหมด" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('ทั้งหมด')
  })

  it('แสดง label ของ value ที่เลือก', () => {
    render(<Combobox value="6" onChange={vi.fn()} options={options} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Bob')
  })

  it('เปิด → พิมพ์ค้นหา → กรองเหลือเฉพาะที่ตรง', async () => {
    render(<Combobox value="" onChange={vi.fn()} options={options} searchPlaceholder="ค้นหา..." />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.type(screen.getByPlaceholderText('ค้นหา...'), 'Ali')
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('เลือก option → onChange(value)', async () => {
    const onChange = vi.fn()
    render(<Combobox value="" onChange={onChange} options={options} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Bob'))
    expect(onChange).toHaveBeenCalledWith('6')
  })

  it('disables the trigger when disabled', () => {
    render(<Combobox value="" onChange={vi.fn()} options={options} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
