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
  const onClear = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PRListFilterForm showRequester={false} onSubmit={onSubmit} onClear={onClear} {...props} />
    </QueryClientProvider>,
  )
  return { ...utils, onSubmit, onClear }
}

// วันสิ้นสุด default = วันนี้ → ต้อง clear ก่อนพิมพ์ใหม่
async function setRange(fromDigits: string, toDigits: string) {
  await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), fromDigits)
  const to = screen.getByLabelText(/วันที่สิ้นสุด/i)
  await userEvent.clear(to)
  await userEvent.type(to, toDigits)
}

describe('PRListFilterForm', () => {
  it('shows required errors when both dates empty', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)
    const { onSubmit } = renderForm()

    await userEvent.clear(screen.getByLabelText(/วันที่สิ้นสุด/i)) // ลบ default วันนี้
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(await screen.findByText('กรุณาเลือกวันที่เริ่มต้น')).toBeInTheDocument()
    expect(screen.getByText('กรุณาเลือกวันที่สิ้นสุด')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows error when from > to', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)
    const { onSubmit } = renderForm()

    await setRange('30062569', '01062569') // 30/06 > 01/06
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(await screen.findByText(/วันที่เริ่มต้นต้องไม่เกิน/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with ISO values when valid', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)
    const { onSubmit } = renderForm()

    await userEvent.type(screen.getByLabelText(/PR Number/i), 'PR-2026')
    await setRange('01012569', '31122569')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ prNumber: 'PR-2026', from: '2026-01-01', to: '2026-12-31' }),
    )
  })

  it('hides Requester field and skips useUsers when showRequester=false', () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)
    renderForm({ showRequester: false })

    expect(screen.queryByLabelText(/ผู้ขอ/i)).not.toBeInTheDocument()
    expect(useUsers).toHaveBeenCalledWith({ enabled: false })
  })

  it('Requester combobox: search by name and submit requesterId', async () => {
    vi.mocked(useUsers).mockReturnValue({
      data: [
        { id: 5, fullName: 'Alice', email: 'a@x.com', firstName: 'Alice', middleName: null, lastName: 'A', role: 'employee', isActive: true, departmentId: 1, createdAt: '', updatedAt: '' },
        { id: 6, fullName: 'Bob', email: 'b@x.com', firstName: 'Bob', middleName: null, lastName: 'B', role: 'employee', isActive: true, departmentId: 1, createdAt: '', updatedAt: '' },
      ],
    } as ReturnType<typeof useUsers>)
    const { onSubmit } = renderForm({ showRequester: true })

    expect(useUsers).toHaveBeenCalledWith({ enabled: true })
    await userEvent.click(screen.getByLabelText(/ผู้ขอ/i))
    await userEvent.type(screen.getByPlaceholderText(/ค้นหาด้วยชื่อ/i), 'Bob')
    await userEvent.click(screen.getByText('Bob'))

    await setRange('01012569', '31122569')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ requesterId: '6' }))
  })

  it('ล้าง resets fields and calls onClear', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)
    const { onClear } = renderForm()

    await userEvent.type(screen.getByLabelText(/PR Number/i), 'PR-XYZ')
    await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '01012569')
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))

    expect(screen.getByLabelText(/PR Number/i)).toHaveValue('')
    expect(screen.getByLabelText(/วันที่เริ่มต้น/i)).toHaveValue('')
    expect(onClear).toHaveBeenCalled()
  })
})
