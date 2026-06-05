import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReceivablePO } from '../types'
import { GRNListFilterForm } from './GRNListFilterForm'

const pos: ReceivablePO[] = [
  { id: 7, poNumber: 'PO-2026-0007', vendor: { id: 1, name: 'Acme Co' }, status: 'acknowledged' },
  { id: 8, poNumber: 'PO-2026-0008', vendor: { id: 2, name: 'Beta Ltd' }, status: 'partially_received' },
]

function renderForm(props: Partial<React.ComponentProps<typeof GRNListFilterForm>> = {}) {
  const onSubmit = vi.fn()
  const onClear = vi.fn()
  const utils = render(
    <GRNListFilterForm pos={pos} onSubmit={onSubmit} onClear={onClear} {...props} />,
  )
  return { ...utils, onSubmit, onClear }
}

describe('GRNListFilterForm', () => {
  it('submits default all/all sentinels when nothing changed', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all', poId: 'all' }),
    )
  })

  it('renders the status options with Thai labels', async () => {
    renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    expect(await screen.findByRole('option', { name: 'รับไม่ครบ' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'รับครบถ้วน' })).toBeInTheDocument()
  })

  it('submits the chosen status', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'รับครบถ้วน' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: 'complete' }))
  })

  it('submits the chosen po id via the combobox', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByLabelText('ใบสั่งซื้อ (PO)'))
    await userEvent.click(screen.getByText('PO-2026-0008'))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ poId: '8' }))
  })

  it('ล้าง is disabled while pristine and enables after a change', async () => {
    renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'รับครบถ้วน' }))
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('ล้าง resets status back to the visible ทั้งหมด default and calls onClear', async () => {
    const { onClear } = renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'รับครบถ้วน' }))
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('รับครบถ้วน')
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(onClear).toHaveBeenCalled()
    // visual reset, not just isDirty: the status trigger shows the ทั้งหมด default again
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('ทั้งหมด')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
  })

  it('choosing a PO then ล้าง resets the combobox back to ทุกใบสั่งซื้อ', async () => {
    renderForm()
    await userEvent.click(screen.getByLabelText('ใบสั่งซื้อ (PO)'))
    await userEvent.click(screen.getByText('PO-2026-0008'))
    expect(screen.getByLabelText('ใบสั่งซื้อ (PO)')).toHaveTextContent('PO-2026-0008')
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(screen.getByLabelText('ใบสั่งซื้อ (PO)')).toHaveTextContent('ทุกใบสั่งซื้อ')
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
  })
})
