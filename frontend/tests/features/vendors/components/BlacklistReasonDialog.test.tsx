import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlacklistReasonDialog } from '@/features/vendors/components/BlacklistReasonDialog'

describe('BlacklistReasonDialog', () => {
  it('shows a validation error and does not call onConfirm when reason is empty', async () => {
    const onConfirm = vi.fn()
    render(<BlacklistReasonDialog open onOpenChange={() => {}} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันแบล็คลิสต์' }))
    expect(await screen.findByText('กรุณาระบุเหตุผล')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm with the trimmed reason when valid', async () => {
    const onConfirm = vi.fn()
    render(<BlacklistReasonDialog open onOpenChange={() => {}} onConfirm={onConfirm} />)
    await userEvent.type(screen.getByLabelText('เหตุผล'), '  ส่งของช้า  ')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันแบล็คลิสต์' }))
    expect(onConfirm).toHaveBeenCalledWith('ส่งของช้า')
  })

  it('disables the confirm button when isPending', () => {
    render(<BlacklistReasonDialog open onOpenChange={() => {}} onConfirm={() => {}} isPending />)
    expect(screen.getByRole('button', { name: 'ยืนยันแบล็คลิสต์' })).toBeDisabled()
  })

  it('resets the reason field after the dialog is closed and reopened', async () => {
    // spec line: "reset เมื่อปิด" — guard the reset-on-close useEffect so removing it fails here
    const { rerender } = render(
      <BlacklistReasonDialog open onOpenChange={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.type(screen.getByLabelText('เหตุผล'), 'ของไม่ตรงสเปค')
    expect(screen.getByLabelText('เหตุผล')).toHaveValue('ของไม่ตรงสเปค')

    rerender(<BlacklistReasonDialog open={false} onOpenChange={() => {}} onConfirm={() => {}} />)
    rerender(<BlacklistReasonDialog open onOpenChange={() => {}} onConfirm={() => {}} />)

    expect(screen.getByLabelText('เหตุผล')).toHaveValue('')
  })
})
