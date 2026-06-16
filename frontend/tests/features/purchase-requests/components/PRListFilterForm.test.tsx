import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PRListFilterForm } from '@/features/purchase-requests/components/PRListFilterForm'

function renderForm(props: Partial<React.ComponentProps<typeof PRListFilterForm>> = {}) {
  const onSubmit = vi.fn()
  const onClear = vi.fn()
  const utils = render(
    <PRListFilterForm showRequester={false} onSubmit={onSubmit} onClear={onClear} {...props} />,
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
    const { onSubmit } = renderForm()

    await userEvent.clear(screen.getByLabelText(/วันที่สิ้นสุด/i)) // ลบ default วันนี้
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(await screen.findByText('กรุณาเลือกวันที่เริ่มต้น')).toBeInTheDocument()
    expect(screen.getByText('กรุณาเลือกวันที่สิ้นสุด')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows error when from > to', async () => {
    const { onSubmit } = renderForm()

    await setRange('30062569', '01062569') // 30/06 > 01/06
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(await screen.findByText(/วันที่เริ่มต้นต้องไม่เกิน/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with ISO values when valid', async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(screen.getByLabelText('เลขที่ PR'), 'PR-2026')
    await setRange('01012569', '31122569')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ prNumber: 'PR-2026', from: '2026-01-01', to: '2026-12-31' }),
    )
  })

  it('reflects the chosen status in the trigger (watch status)', async () => {
    renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'อนุมัติแล้ว' }))
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('อนุมัติแล้ว')
  })

  it('hides Requester field when showRequester=false', () => {
    renderForm({ showRequester: false })
    expect(screen.queryByLabelText(/ผู้ขอ/i)).not.toBeInTheDocument()
  })

  it('Requester free-text: shows Input when showRequester and submits requesterName', async () => {
    const { onSubmit } = renderForm({ showRequester: true })

    await userEvent.type(screen.getByLabelText(/ผู้ขอ/i), 'สมชาย')
    await setRange('01012569', '31122569')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ requesterName: 'สมชาย' }))
  })

  it('ล้าง resets fields and calls onClear', async () => {
    const { onClear } = renderForm()

    await userEvent.type(screen.getByLabelText('เลขที่ PR'), 'PR-XYZ')
    await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '01012569')
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))

    expect(screen.getByLabelText('เลขที่ PR')).toHaveValue('')
    expect(screen.getByLabelText(/วันที่เริ่มต้น/i)).toHaveValue('')
    expect(onClear).toHaveBeenCalled()
  })

  it('ล้าง รีเซ็ตวันที่สิ้นสุด (default วันนี้) ให้เป็นค่าว่าง ไม่ใช่กลับไปเป็นวันนี้', async () => {
    renderForm()
    // ทำให้ form dirty เพื่อเปิดปุ่มล้าง แล้วกดล้าง — to ต้องว่าง ไม่ใช่ default วันนี้
    await userEvent.type(screen.getByLabelText('เลขที่ PR'), 'PR-1')
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(screen.getByLabelText(/วันที่สิ้นสุด/i)).toHaveValue('')
  })

  it('ล้าง button is disabled when the form is pristine', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
  })

  it('ล้าง button enables after the user changes a field', async () => {
    renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('เลขที่ PR'), 'PR-2026')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('seeds every field from initialValues (restore from a deep-linked URL)', () => {
    renderForm({
      showRequester: true,
      initialValues: {
        prNumber: 'PR-2026-0009',
        search: 'office',
        from: '2026-01-01',
        to: '2026-12-31',
        requesterName: 'สมชาย',
        status: 'approved',
      },
    })
    expect(screen.getByLabelText('เลขที่ PR')).toHaveValue('PR-2026-0009')
    expect(screen.getByLabelText('ชื่อรายการ')).toHaveValue('office')
    expect(screen.getByLabelText(/ผู้ขอ/i)).toHaveValue('สมชาย')
    expect(screen.getByLabelText(/วันที่เริ่มต้น/i)).toHaveValue('01/01/2569')
    expect(screen.getByLabelText(/วันที่สิ้นสุด/i)).toHaveValue('31/12/2569')
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('อนุมัติแล้ว')
  })

  it('ล้าง button is enabled when canClear even if the form is pristine', () => {
    renderForm({ canClear: true })
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })
})
