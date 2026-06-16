import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title, description and confirm label when open', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="ยืนยันการอนุมัติ"
        description="ระบบจะจองงบประมาณ"
        confirmLabel="ยืนยันอนุมัติ"
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('ยืนยันการอนุมัติ')).toBeInTheDocument()
    expect(screen.getByText('ระบบจะจองงบประมาณ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยืนยันอนุมัติ' })).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="t"
        confirmLabel="ยืนยันอนุมัติ"
        onConfirm={onConfirm}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันอนุมัติ' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('disables both buttons when isPending', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="t"
        confirmLabel="ยืนยันอนุมัติ"
        onConfirm={() => {}}
        isPending
      />,
    )
    expect(screen.getByRole('button', { name: 'ยืนยันอนุมัติ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeDisabled()
  })

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="hidden-title"
        confirmLabel="ยืนยันอนุมัติ"
        onConfirm={() => {}}
      />,
    )
    expect(screen.queryByText('hidden-title')).not.toBeInTheDocument()
  })
})
