import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateVendorDialog } from './RateVendorDialog'

function setup(onConfirm = vi.fn()) {
  render(<RateVendorDialog open onOpenChange={vi.fn()} vendorName="บริษัท ก" onConfirm={onConfirm} />)
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
})
