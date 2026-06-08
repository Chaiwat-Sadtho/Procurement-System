import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VendorListFilterForm } from './VendorListFilterForm'
import type { VendorCategory } from '../types'

const categories: VendorCategory[] = [
  { id: 1, name: 'Hardware' },
  { id: 2, name: 'Software' },
]

function renderForm(props: Partial<React.ComponentProps<typeof VendorListFilterForm>> = {}) {
  const onSubmit = vi.fn()
  const onClear = vi.fn()
  const utils = render(
    <VendorListFilterForm
      categories={categories}
      onSubmit={onSubmit}
      onClear={onClear}
      {...props}
    />,
  )
  return { ...utils, onSubmit, onClear }
}

describe('VendorListFilterForm', () => {
  it('submits typed search together with default dropdown values', async () => {
    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByLabelText('ชื่อผู้ขาย'), 'ACME')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'ACME', isBlacklisted: 'all', categoryId: 'all' }),
    )
  })

  it('ล้าง is disabled while pristine, enables after typing, then resets + calls onClear', async () => {
    const { onClear } = renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('ชื่อผู้ขาย'), 'ACME')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(screen.getByLabelText('ชื่อผู้ขาย')).toHaveValue('')
    expect(onClear).toHaveBeenCalled()
  })

  it('keeps ล้าง enabled while pristine when canClear is true', () => {
    renderForm({ canClear: true })
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('changing only the category (Combobox) flips isDirty → enables ล้าง', async () => {
    renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('หมวดหมู่'))
    await userEvent.click(screen.getByText('Hardware'))
    // the combobox trigger reflects the watched categoryId (pins watch -> useWatch swap)
    expect(screen.getByLabelText('หมวดหมู่')).toHaveTextContent('Hardware')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('reflects the chosen blacklist status in the trigger (watch isBlacklisted)', async () => {
    renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'แบล็คลิสต์' }))
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('แบล็คลิสต์')
  })

  it('renders category options from the categories prop', async () => {
    renderForm()
    await userEvent.click(screen.getByLabelText('หมวดหมู่'))
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Software')).toBeInTheDocument()
  })

  it('restores initialValues into the inputs and enables ล้าง when canClear', () => {
    renderForm({
      initialValues: { search: 'acme', isBlacklisted: 'true', categoryId: '2' },
      canClear: true,
    })
    expect(screen.getByLabelText('ชื่อผู้ขาย')).toHaveValue('acme')
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('แบล็คลิสต์') // isBlacklisted=true
    expect(screen.getByLabelText('หมวดหมู่')).toHaveTextContent('Software') // categoryId=2 → Software
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })
})
