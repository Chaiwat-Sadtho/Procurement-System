import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BudgetListFilterForm } from './BudgetListFilterForm'

const departments = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Finance' },
]

describe('BudgetListFilterForm', () => {
  it('submits the chosen fiscal year', async () => {
    const onSubmit = vi.fn()
    render(
      <BudgetListFilterForm departments={departments} onSubmit={onSubmit} defaultFiscalYear={2026} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ fiscalYear: 2026 }))
  })

  it('locks the department for a manager', () => {
    render(
      <BudgetListFilterForm
        departments={departments}
        onSubmit={vi.fn()}
        defaultFiscalYear={2026}
        lockedDepartmentId={2}
      />,
    )
    // manager: department combobox disabled
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('restores initialValues into the inputs and enables ล้าง when canClear', () => {
    render(
      <BudgetListFilterForm
        departments={departments}
        onSubmit={vi.fn()}
        defaultFiscalYear={2026}
        initialValues={{ fiscalYear: 2025, departmentId: 2 }}
        canClear
      />,
    )
    expect(screen.getByLabelText('ปีงบประมาณ')).toHaveValue(2025)
    expect(screen.getByLabelText('แผนก')).toHaveTextContent('Finance') // departmentId=2
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('ล้าง resets to defaults and calls onClear', async () => {
    const onClear = vi.fn()
    render(
      <BudgetListFilterForm
        departments={departments}
        onSubmit={vi.fn()}
        defaultFiscalYear={2026}
        initialValues={{ fiscalYear: 2025, departmentId: 2 }}
        onClear={onClear}
        canClear
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(onClear).toHaveBeenCalled()
    expect(screen.getByLabelText('ปีงบประมาณ')).toHaveValue(2026) // back to default year
    expect(screen.getByLabelText('แผนก')).toHaveTextContent('ทุกแผนก') // back to all
  })
})
