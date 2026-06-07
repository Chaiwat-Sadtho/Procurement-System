import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Vendor } from '../types'
import { createDefaultValues, vendorToFormValues } from '../lib/vendorFormSchema'

vi.mock('../hooks/useVendorMutations', () => ({ useVendorMutations: vi.fn() }))
vi.mock('../hooks/useVendorCategories', () => ({ useVendorCategories: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useVendorMutations } from '../hooks/useVendorMutations'
import { useVendorCategories } from '../hooks/useVendorCategories'
import { toast } from 'sonner'
import { VendorForm } from './VendorForm'

function makeMutations(over: Record<string, unknown> = {}) {
  const m = {
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
    ...over,
  }
  vi.mocked(useVendorMutations).mockReturnValue(
    m as unknown as ReturnType<typeof useVendorMutations>,
  )
  return m
}

function setCategories() {
  vi.mocked(useVendorCategories).mockReturnValue({
    data: [
      { id: 1, name: 'Hardware' },
      { id: 2, name: 'Software' },
    ],
  } as unknown as ReturnType<typeof useVendorCategories>)
}

function renderForm(
  props: React.ComponentProps<typeof VendorForm> = {
    mode: 'create',
    defaultValues: createDefaultValues(),
  },
) {
  return render(
    <MemoryRouter>
      <VendorForm {...props} />
    </MemoryRouter>,
  )
}

describe('VendorForm — create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setCategories()
  })

  it('disables บันทึก until the form is dirty and valid', async () => {
    makeMutations()
    renderForm()
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/ชื่อผู้ขาย/), 'ACME')
    await waitFor(() => expect(screen.getByRole('button', { name: 'บันทึก' })).toBeEnabled())
  })

  it('disables ยกเลิก and keeps บันทึก disabled while a save is in flight (isPending)', async () => {
    // a mutation in flight must lock both buttons: ยกเลิก is gated purely on isPending,
    // and บันทึก must stay disabled even once the form is dirty+valid (guards the `|| isPending` clause)
    makeMutations({ createMutation: { mutateAsync: vi.fn(), isPending: true } })
    renderForm()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/ชื่อผู้ขาย/), 'ACME')
    await waitFor(() => expect(screen.getByLabelText(/ชื่อผู้ขาย/)).toHaveValue('ACME'))
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
  })

  it('creates with the mapped payload (blank optionals to null) and navigates', async () => {
    const m = makeMutations()
    m.createMutation.mutateAsync.mockResolvedValue({ id: 42 } as Vendor)
    renderForm()
    await userEvent.type(screen.getByLabelText(/ชื่อผู้ขาย/), 'ACME')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() =>
      expect(m.createMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'ACME',
        taxId: null,
        email: null,
        phone: null,
        address: null,
        categoryIds: [],
      }),
    )
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/42')
    expect(toast.success).toHaveBeenCalledWith('สร้างผู้ขายแล้ว')
  })

  it('double-click on save fires create only once (in-flight guard)', async () => {
    const m = makeMutations()
    let resolveCreate!: (v: Vendor) => void
    const deferred = new Promise<Vendor>((r) => {
      resolveCreate = r
    })
    m.createMutation.mutateAsync.mockReturnValue(deferred)
    renderForm()
    await userEvent.type(screen.getByLabelText(/ชื่อผู้ขาย/), 'ACME')
    const saveBtn = screen.getByRole('button', { name: 'บันทึก' })
    await userEvent.click(saveBtn)
    await userEvent.click(saveBtn)
    await waitFor(() => expect(m.createMutation.mutateAsync).toHaveBeenCalledTimes(1))
    resolveCreate({ id: 42 } as Vendor)
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/vendors/42'))
  })

  it('shows an error toast when create fails', async () => {
    const m = makeMutations()
    m.createMutation.mutateAsync.mockRejectedValue(new Error('boom'))
    renderForm()
    await userEvent.type(screen.getByLabelText(/ชื่อผู้ขาย/), 'ACME')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('VendorForm — edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setCategories()
  })

  const vendor = {
    id: 3,
    name: 'OldCo',
    taxId: '0105551234567',
    email: null,
    phone: null,
    address: null,
    isBlacklisted: false,
    blacklistReason: null,
    ratingAvg: null,
    categories: [{ id: 1, name: 'Hardware' }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as Vendor

  it('updates with the mapped payload and navigates to detail', async () => {
    const m = makeMutations()
    m.updateMutation.mutateAsync.mockResolvedValue(vendor)
    renderForm({ mode: 'edit', vendorId: 3, defaultValues: vendorToFormValues(vendor) })
    const name = screen.getByLabelText(/ชื่อผู้ขาย/)
    await userEvent.clear(name)
    await userEvent.type(name, 'NewCo')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() =>
      expect(m.updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 3,
        data: {
          name: 'NewCo',
          taxId: '0105551234567',
          email: null,
          phone: null,
          address: null,
          categoryIds: [1],
        },
      }),
    )
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/3')
    expect(toast.success).toHaveBeenCalledWith('บันทึกแล้ว')
  })

  it('keeps บันทึก disabled on a pristine prefilled form and enables it after an edit (no-op-save guard)', async () => {
    makeMutations()
    renderForm({ mode: 'edit', vendorId: 3, defaultValues: vendorToFormValues(vendor) })
    // prefilled + valid but not yet dirty -> !isDirty keeps save disabled (a no-op save cannot fire)
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/ชื่อผู้ขาย/), 'X')
    await waitFor(() => expect(screen.getByRole('button', { name: 'บันทึก' })).toBeEnabled())
  })

  it('shows an error toast and does not navigate when update fails', async () => {
    const m = makeMutations()
    m.updateMutation.mutateAsync.mockRejectedValue(new Error('boom'))
    renderForm({ mode: 'edit', vendorId: 3, defaultValues: vendorToFormValues(vendor) })
    const name = screen.getByLabelText(/ชื่อผู้ขาย/)
    await userEvent.clear(name)
    await userEvent.type(name, 'NewCo')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('double-click on save fires update only once (in-flight guard)', async () => {
    const m = makeMutations()
    let resolveUpdate!: (v: Vendor) => void
    const deferred = new Promise<Vendor>((r) => {
      resolveUpdate = r
    })
    m.updateMutation.mutateAsync.mockReturnValue(deferred)
    renderForm({ mode: 'edit', vendorId: 3, defaultValues: vendorToFormValues(vendor) })
    const name = screen.getByLabelText(/ชื่อผู้ขาย/)
    await userEvent.clear(name)
    await userEvent.type(name, 'NewCo')
    const saveBtn = screen.getByRole('button', { name: 'บันทึก' })
    await userEvent.click(saveBtn)
    await userEvent.click(saveBtn)
    await waitFor(() => expect(m.updateMutation.mutateAsync).toHaveBeenCalledTimes(1))
    resolveUpdate(vendor)
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/vendors/3'))
  })
})
