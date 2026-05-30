import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PRListFilterForm } from './PRListFilterForm'

vi.mock('@/features/users/hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

import { useUsers } from '@/features/users/hooks/useUsers'

function renderForm(props: Partial<React.ComponentProps<typeof PRListFilterForm>> = {}) {
  const onSubmit = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PRListFilterForm showRequester={false} onSubmit={onSubmit} {...props} />
    </QueryClientProvider>,
  )
  return { ...utils, onSubmit }
}

describe('PRListFilterForm', () => {
  it('shows required errors when submitting empty', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)

    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(await screen.findByText('กรุณาเลือกวันที่เริ่มต้น')).toBeInTheDocument()
    expect(screen.getByText('กรุณาเลือกวันที่สิ้นสุด')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows error when from > to', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)

    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '2026-06-30')
    await userEvent.type(screen.getByLabelText(/วันที่สิ้นสุด/i), '2026-06-01')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(await screen.findByText(/วันที่เริ่มต้นต้องไม่เกิน/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with values when form is valid', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)

    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByLabelText(/PR Number/i), 'PR-2026')
    await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '2026-01-01')
    await userEvent.type(screen.getByLabelText(/วันที่สิ้นสุด/i), '2026-12-31')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prNumber: 'PR-2026',
        from: '2026-01-01',
        to: '2026-12-31',
      }),
    )
  })

  it('hides Requester field and skips useUsers when showRequester=false', () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)

    renderForm({ showRequester: false })

    expect(screen.queryByLabelText(/ผู้ขอ/i)).not.toBeInTheDocument()
    expect(useUsers).toHaveBeenCalledWith({ enabled: false })
  })

  it('renders Requester options when showRequester=true and useUsers returns data', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: [
        { id: 5, fullName: 'Alice', email: 'a@x.com', firstName: 'Alice', middleName: null, lastName: 'A', role: 'employee', isActive: true, departmentId: 1, createdAt: '', updatedAt: '' },
        { id: 6, fullName: 'Bob', email: 'b@x.com', firstName: 'Bob', middleName: null, lastName: 'B', role: 'employee', isActive: true, departmentId: 1, createdAt: '', updatedAt: '' },
      ],
    } as ReturnType<typeof useUsers>)

    renderForm({ showRequester: true })

    expect(screen.getByLabelText(/ผู้ขอ/i)).toBeInTheDocument()
    expect(useUsers).toHaveBeenCalledWith({ enabled: true })
  })
})
