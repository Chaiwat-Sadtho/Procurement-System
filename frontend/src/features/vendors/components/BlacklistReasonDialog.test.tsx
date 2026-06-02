import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlacklistReasonDialog } from './BlacklistReasonDialog'

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
})
