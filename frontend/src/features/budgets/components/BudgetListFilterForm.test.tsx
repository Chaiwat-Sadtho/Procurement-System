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
})
