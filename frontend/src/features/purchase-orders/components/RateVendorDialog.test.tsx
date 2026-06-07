import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateVendorDialog } from './RateVendorDialog'

function setup(onConfirm = vi.fn()) {
  render(
    <RateVendorDialog open onOpenChange={vi.fn()} vendorName="บริษัท ก" onConfirm={onConfirm} />,
  )
  return onConfirm
}

describe('RateVendorDialog', () => {
  it('shows the vendor name in the title', () => {
    setup()
    expect(screen.getByText('ให้คะแนนผู้ขาย: บริษัท ก')).toBeInTheDocument()
  })

  it('disables submit until a score is selected', async () => {
    const user = userEvent.setup()
    setup()
    const submit = screen.getByRole('button', { name: 'บันทึกคะแนน' })
    expect(submit).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: '4 ดาว' }))
    expect(submit).toBeEnabled()
  })

  it('submits score + comment via onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = setup()
    await user.click(screen.getByRole('radio', { name: '5 ดาว' }))
    await user.type(screen.getByLabelText('ความคิดเห็น (ไม่บังคับ)'), 'ดีมาก')
    await user.click(screen.getByRole('button', { name: 'บันทึกคะแนน' }))
    expect(onConfirm).toHaveBeenCalledWith({ score: 5, comment: 'ดีมาก' })
  })

  it('omits comment from payload when blank', async () => {
    const user = userEvent.setup()
    const onConfirm = setup()
    await user.click(screen.getByRole('radio', { name: '3 ดาว' }))
    await user.click(screen.getByRole('button', { name: 'บันทึกคะแนน' }))
    expect(onConfirm).toHaveBeenCalledWith({ score: 3 })
  })

  it('shows a muted hint until a score is selected', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByText('เลือกดาวเพื่อให้คะแนน')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '4 ดาว' }))
    expect(screen.queryByText('เลือกดาวเพื่อให้คะแนน')).not.toBeInTheDocument()
  })

  it('labels the score control as a radiogroup named คะแนน', () => {
    setup()
    expect(screen.getByRole('radiogroup', { name: 'คะแนน' })).toBeInTheDocument()
  })

  it('disables both buttons while a submission is pending', async () => {
    const user = userEvent.setup()
    render(
      <RateVendorDialog
        open
        onOpenChange={vi.fn()}
        vendorName="บริษัท ก"
        onConfirm={vi.fn()}
        isPending
      />,
    )
    // เลือกดาวให้ form valid ก่อน — submit ที่ disabled ต้องมาจาก isPending ไม่ใช่ !isValid (non-vacuous)
    await user.click(screen.getByRole('radio', { name: '4 ดาว' }))
    expect(screen.getByRole('button', { name: 'บันทึกคะแนน' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeDisabled()
  })

  it('closes the dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <RateVendorDialog
        open
        onOpenChange={onOpenChange}
        vendorName="บริษัท ก"
        onConfirm={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets the form when reopened after closing', async () => {
    const user = userEvent.setup()
    const props = { onOpenChange: vi.fn(), vendorName: 'บริษัท ก', onConfirm: vi.fn() }
    const { rerender } = render(<RateVendorDialog open {...props} />)
    await user.click(screen.getByRole('radio', { name: '5 ดาว' }))
    expect(screen.getByRole('radio', { name: '5 ดาว' })).toHaveAttribute('aria-checked', 'true')
    rerender(<RateVendorDialog open={false} {...props} />)
    rerender(<RateVendorDialog open {...props} />)
    // score reset เป็น 0 → ไม่มีดาวถูกเลือก + muted hint กลับมา (assert ที่ value-level, ไม่ผูก isValid timing)
    expect(screen.getByRole('radio', { name: '5 ดาว' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('เลือกดาวเพื่อให้คะแนน')).toBeInTheDocument()
  })
})
