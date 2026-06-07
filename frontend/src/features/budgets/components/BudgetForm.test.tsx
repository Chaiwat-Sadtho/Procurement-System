import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BudgetForm } from './BudgetForm'
import { createDefaultValues } from '../lib/budgetFormSchema'

function renderForm(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const departments = [{ id: 1, name: 'Engineering' }]

describe('BudgetForm', () => {
  it('create mode: submit disabled until valid + dirty', () => {
    renderForm(
      <BudgetForm mode="create" departments={departments} defaultValues={createDefaultValues()} />,
    )
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
  })

  it('edit mode: department/year/quarter render read-only', () => {
    renderForm(
      <BudgetForm
        mode="edit"
        budgetId={5}
        committed={200000}
        departments={departments}
        defaultValues={{
          departmentId: 1,
          fiscalYear: 2026,
          quarter: 'annual',
          totalAmount: '1000000',
        }}
      />,
    )
    // read-only แสดงเป็นข้อความ ไม่ใช่ control ที่แก้ได้
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('รายปี')).toBeInTheDocument()
  })
})
