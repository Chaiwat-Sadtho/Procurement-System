import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserListFilterForm } from './UserListFilterForm'

function renderForm(props: Partial<React.ComponentProps<typeof UserListFilterForm>> = {}) {
  const onSubmit = vi.fn()
  const onClear = vi.fn()
  const utils = render(<UserListFilterForm onSubmit={onSubmit} onClear={onClear} {...props} />)
  return { ...utils, onSubmit, onClear }
}

describe('UserListFilterForm', () => {
  it('submits default values when nothing changed', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ search: '', role: 'all', status: 'all' }),
    )
  })

  it('submits the typed search term', async () => {
    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByLabelText('ค้นหา'), 'somchai')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ search: 'somchai' }))
  })

  it('submits the chosen role', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByLabelText('บทบาท'))
    await userEvent.click(await screen.findByRole('option', { name: 'ผู้จัดการ' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ role: 'manager' }))
  })

  it('submits the chosen status', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'ปิดใช้งาน' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' }))
  })

  it('ล้าง is disabled while pristine and enables after a change', async () => {
    renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('ค้นหา'), 'x')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('keeps ล้าง enabled while pristine when canClear is true', () => {
    renderForm({ canClear: true })
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('ล้าง resets the form and calls onClear', async () => {
    const { onClear } = renderForm()
    await userEvent.type(screen.getByLabelText('ค้นหา'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(onClear).toHaveBeenCalled()
    expect(screen.getByLabelText('ค้นหา')).toHaveValue('')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
  })
})
