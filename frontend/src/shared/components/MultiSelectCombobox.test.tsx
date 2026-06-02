import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiSelectCombobox } from './MultiSelectCombobox'
import type { ComboboxOption } from './Combobox'

const options: ComboboxOption[] = [
  { value: '1', label: 'Hardware' },
  { value: '2', label: 'Software' },
  { value: '3', label: 'Services' },
]

function Harness({ initial = [], onChangeSpy }: { initial?: string[]; onChangeSpy?: (v: string[]) => void }) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <MultiSelectCombobox
      value={value}
      onChange={(v) => {
        setValue(v)
        onChangeSpy?.(v)
      }}
      options={options}
    />
  )
}

describe('MultiSelectCombobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<MultiSelectCombobox value={[]} onChange={vi.fn()} options={options} placeholder="เลือกหมวดหมู่" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('เลือกหมวดหมู่')
  })

  it('shows a count label when items are selected', () => {
    render(<MultiSelectCombobox value={['1', '2']} onChange={vi.fn()} options={options} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('เลือกแล้ว 2 รายการ')
  })

  it('toggles an option on and keeps the popover open for a second pick', async () => {
    const onChangeSpy = vi.fn()
    render(<Harness onChangeSpy={onChangeSpy} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Software' }))
    expect(onChangeSpy).toHaveBeenLastCalledWith(['2'])
    expect(screen.getByPlaceholderText('ค้นหา...')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Hardware' }))
    expect(onChangeSpy).toHaveBeenLastCalledWith(['2', '1'])
  })

  it('toggles an already-selected option off when clicked again', async () => {
    const onChangeSpy = vi.fn()
    render(<Harness initial={['2']} onChangeSpy={onChangeSpy} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Software' }))
    expect(onChangeSpy).toHaveBeenLastCalledWith([])
  })

  it('renders a removable badge per selected option and removes it on x', async () => {
    const onChangeSpy = vi.fn()
    render(<Harness initial={['1', '2']} onChangeSpy={onChangeSpy} />)
    expect(screen.getByRole('button', { name: 'ลบ Hardware' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ลบ Hardware' }))
    expect(onChangeSpy).toHaveBeenLastCalledWith(['2'])
  })

  it('shows the empty text when there are no options', async () => {
    render(<MultiSelectCombobox value={[]} onChange={vi.fn()} options={[]} emptyText="ไม่พบหมวดหมู่" />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('ไม่พบหมวดหมู่')).toBeInTheDocument()
  })
})
