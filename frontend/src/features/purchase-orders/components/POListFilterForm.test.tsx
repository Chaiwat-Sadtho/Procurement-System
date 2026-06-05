import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Vendor } from '@/features/vendors/types'
import { POListFilterForm } from './POListFilterForm'

const vendors: Vendor[] = [
  {
    id: 7,
    name: 'Acme Co',
    taxId: null,
    email: null,
    phone: null,
    address: null,
    isBlacklisted: false,
    blacklistReason: null,
    ratingAvg: null,
    categories: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 8,
    name: 'Beta Ltd',
    taxId: null,
    email: null,
    phone: null,
    address: null,
    isBlacklisted: false,
    blacklistReason: null,
    ratingAvg: null,
    categories: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

function renderForm(props: Partial<React.ComponentProps<typeof POListFilterForm>> = {}) {
  const onSubmit = vi.fn()
  const onClear = vi.fn()
  const utils = render(
    <POListFilterForm vendors={vendors} onSubmit={onSubmit} onClear={onClear} {...props} />,
  )
  return { ...utils, onSubmit, onClear }
}

describe('POListFilterForm', () => {
  it('submits default all/all sentinels when nothing changed', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all', vendorId: 'all' }),
    )
  })

  it('submits the chosen status', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'ส่งแล้ว' }))
    // the controlled trigger reflects the watched value (pins watch -> useWatch swap)
    expect(screen.getByLabelText('สถานะ')).toHaveTextContent('ส่งแล้ว')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent' }),
    )
  })

  it('submits the chosen vendor id via the combobox', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByLabelText('ผู้ขาย'))
    await userEvent.click(screen.getByText('Beta Ltd'))
    expect(screen.getByLabelText('ผู้ขาย')).toHaveTextContent('Beta Ltd')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ vendorId: '8' }),
    )
  })

  it('ล้าง is disabled while pristine and enables after a change', async () => {
    renderForm()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'ส่งแล้ว' }))
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeEnabled()
  })

  it('ล้าง resets to all and calls onClear', async () => {
    const { onClear } = renderForm()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'ส่งแล้ว' }))
    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))
    expect(onClear).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeDisabled()
  })
})
