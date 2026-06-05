import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserListFilterForm } from './UserListFilterForm'
import { DEFAULT_USER_FILTERS, type UserFilterValues } from '../lib/userFilters'

function renderForm(values: UserFilterValues = DEFAULT_USER_FILTERS) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(<UserListFilterForm values={values} onChange={onChange} onClear={onClear} />)
  return { onChange, onClear }
}

describe('UserListFilterForm', () => {
  it('typing in search fires onChange with the new search term', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.type(screen.getByLabelText('ค้นหา'), 'ก')
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_USER_FILTERS, search: 'ก' })
  })

  it('choosing a role fires onChange with that role', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByLabelText('บทบาท'))
    await user.click(screen.getByRole('option', { name: 'ผู้จัดการ' }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_USER_FILTERS, role: 'manager' })
  })

  it('choosing a status fires onChange with that status', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByLabelText('สถานะ'))
    await user.click(screen.getByRole('option', { name: 'ปิดใช้งาน' }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_USER_FILTERS, status: 'inactive' })
  })

  it('clear button is disabled at default and enabled once a filter is set', () => {
    const { rerender } = render(
      <UserListFilterForm values={DEFAULT_USER_FILTERS} onChange={vi.fn()} onClear={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'ล้าง' })).toBeDisabled()
    rerender(
      <UserListFilterForm
        values={{ ...DEFAULT_USER_FILTERS, search: 'x' }}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'ล้าง' })).toBeEnabled()
  })

  it('clear button fires onClear', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(
      <UserListFilterForm
        values={{ ...DEFAULT_USER_FILTERS, search: 'x' }}
        onChange={vi.fn()}
        onClear={onClear}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'ล้าง' }))
    expect(onClear).toHaveBeenCalled()
  })
})
