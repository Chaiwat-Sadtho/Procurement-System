import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RejectReasonDialog } from '@/features/purchase-requests/components/RejectReasonDialog'

describe('RejectReasonDialog', () => {
  it('shows a validation error and does not call onConfirm when reason is empty', async () => {
    const onConfirm = vi.fn()
    render(<RejectReasonDialog open onOpenChange={() => {}} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันปฏิเสธ' }))
    expect(await screen.findByText('กรุณาระบุเหตุผล')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm with the trimmed reason when valid', async () => {
    const onConfirm = vi.fn()
    render(<RejectReasonDialog open onOpenChange={() => {}} onConfirm={onConfirm} />)
    await userEvent.type(screen.getByLabelText('เหตุผล'), '  งบไม่พอ  ')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันปฏิเสธ' }))
    expect(onConfirm).toHaveBeenCalledWith('งบไม่พอ')
  })

  it('disables the submit button when isPending', () => {
    render(<RejectReasonDialog open onOpenChange={() => {}} onConfirm={() => {}} isPending />)
    expect(screen.getByRole('button', { name: 'ยืนยันปฏิเสธ' })).toBeDisabled()
  })
})
