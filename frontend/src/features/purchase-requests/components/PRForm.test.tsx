import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PurchaseRequest } from '../types'
import { createDefaultValues, prToFormValues } from '../lib/prFormSchema'

vi.mock('../hooks/usePRMutations', () => ({ usePRMutations: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { usePRMutations } from '../hooks/usePRMutations'
import { toast } from 'sonner'
import { PRForm } from './PRForm'

function makeMutations(over: Record<string, unknown> = {}) {
  const m = {
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
    submitMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteMutation: { mutateAsync: vi.fn(), isPending: false },
    ...over,
  }
  vi.mocked(usePRMutations).mockReturnValue(m as unknown as ReturnType<typeof usePRMutations>)
  return m
}

function renderForm(
  props: React.ComponentProps<typeof PRForm> = {
    mode: 'create',
    defaultValues: createDefaultValues(),
  },
) {
  return render(
    <MemoryRouter>
      <PRForm {...props} />
    </MemoryRouter>,
  )
}

async function fillRequired() {
  await userEvent.type(screen.getByLabelText(/ชื่อเรื่อง/), 'จัดซื้อกระดาษ')
  await userEvent.type(screen.getByLabelText(/วันที่ต้องการ/), '01072569') // -> 2026-07-01
  await userEvent.type(screen.getByLabelText(/ชื่อรายการ/), 'กระดาษ A4')
  await userEvent.clear(screen.getByLabelText(/จำนวน/))
  await userEvent.type(screen.getByLabelText(/จำนวน/), '10')
  await userEvent.type(screen.getByLabelText(/^หน่วย/), 'รีม')
  await userEvent.clear(screen.getByLabelText(/ราคาต่อหน่วย/))
  await userEvent.type(screen.getByLabelText(/ราคาต่อหน่วย/), '120')
}

describe('PRForm — create', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves a draft with the mapped payload and navigates to detail', async () => {
    const m = makeMutations()
    m.createMutation.mutateAsync.mockResolvedValue({ id: 42 } as PurchaseRequest)
    renderForm()
    await fillRequired()
    await userEvent.click(screen.getByRole('button', { name: 'บันทึกร่าง' }))
    await waitFor(() =>
      expect(m.createMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'จัดซื้อกระดาษ',
          requiredDate: '2026-07-01',
          quarter: null,
          items: [expect.objectContaining({ itemName: 'กระดาษ A4', quantity: 10, unit: 'รีม', estimatedUnitPrice: 120 })],
        }),
      ),
    )
    expect(m.submitMutation.mutateAsync).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/42')
    expect(toast.success).toHaveBeenCalledWith('บันทึกร่างแล้ว')
  })

  it('double-click on save fires create only once (synchronous in-flight guard)', async () => {
    const m = makeMutations()
    let resolveCreate!: (v: PurchaseRequest) => void
    const deferred = new Promise<PurchaseRequest>((r) => {
      resolveCreate = r
    })
    m.createMutation.mutateAsync.mockReturnValue(deferred)
    renderForm()
    await fillRequired()
    const saveBtn = screen.getByRole('button', { name: 'บันทึกร่าง' })
    // Two clicks without awaiting resolution between them: first call is still
    // in-flight when the second click happens.
    await userEvent.click(saveBtn)
    await userEvent.click(saveBtn)
    await waitFor(() => expect(m.createMutation.mutateAsync).toHaveBeenCalledTimes(1))
    // resolve the deferred so the in-flight promise settles (avoids act warnings)
    resolveCreate({ id: 42 } as PurchaseRequest)
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/42'))
  })

  it('save + submit: creates then submits then navigates', async () => {
    const m = makeMutations()
    m.createMutation.mutateAsync.mockResolvedValue({ id: 42 } as PurchaseRequest)
    m.submitMutation.mutateAsync.mockResolvedValue({ id: 42 } as PurchaseRequest)
    renderForm()
    await fillRequired()
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' }))
    await waitFor(() => expect(m.submitMutation.mutateAsync).toHaveBeenCalledWith(42))
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/42')
    expect(toast.success).toHaveBeenCalledWith('ส่งคำขอซื้อแล้ว')
  })

  it('create ok but submit fails: still navigates to detail + error toast (no duplicate create)', async () => {
    const m = makeMutations()
    m.createMutation.mutateAsync.mockResolvedValue({ id: 42 } as PurchaseRequest)
    m.submitMutation.mutateAsync.mockRejectedValue(new Error('boom'))
    renderForm()
    await fillRequired()
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(m.createMutation.mutateAsync).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/42')
  })

  it('keeps both save buttons disabled while required fields are empty', () => {
    const m = makeMutations()
    renderForm()
    expect(screen.getByRole('button', { name: 'บันทึกร่าง' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' })).toBeDisabled()
    expect(m.createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('enables the save buttons once required fields are valid', async () => {
    makeMutations()
    renderForm()
    await fillRequired()
    await waitFor(() => expect(screen.getByRole('button', { name: 'บันทึกร่าง' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' })).toBeEnabled()
  })
})

describe('PRForm — edit', () => {
  beforeEach(() => vi.clearAllMocks())

  const pr = {
    id: 3, title: 'ของเดิม', requiredDate: '2026-08-15', quarter: 2,
    items: [{ id: 1, prId: 3, itemName: 'หมึก', description: null, quantity: 5, unit: 'กล่อง', estimatedUnitPrice: 300, estimatedTotalPrice: 1500 }],
  } as unknown as PurchaseRequest

  it('updates with payload that omits quarter and navigates', async () => {
    const m = makeMutations()
    m.updateMutation.mutateAsync.mockResolvedValue(pr)
    renderForm({ mode: 'edit', prId: 3, defaultValues: prToFormValues(pr) })
    const title = screen.getByLabelText(/ชื่อเรื่อง/)
    await userEvent.clear(title)
    await userEvent.type(title, 'แก้ชื่อ')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึกร่าง' }))
    await waitFor(() =>
      expect(m.updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 3,
        data: {
          title: 'แก้ชื่อ',
          requiredDate: '2026-08-15',
          items: [{ itemName: 'หมึก', quantity: 5, unit: 'กล่อง', estimatedUnitPrice: 300 }],
        },
      }),
    )
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/3')
  })

  it('disables the period selector in edit mode', () => {
    makeMutations()
    renderForm({ mode: 'edit', prId: 3, defaultValues: prToFormValues(pr) })
    expect(screen.getByLabelText(/งบประมาณ|ช่วงเวลา|ไตรมาส/)).toBeDisabled()
  })

  it('draft save is disabled on a pristine prefilled draft, but submit-for-approval stays enabled (state change, not a no-op)', async () => {
    makeMutations()
    renderForm({ mode: 'edit', prId: 3, defaultValues: prToFormValues(pr) })
    // submit-for-approval gates on validity only -> enabled on an unchanged valid draft
    await waitFor(() => expect(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' })).toBeEnabled())
    // draft re-save of an unchanged form is a no-op -> disabled until something changes
    expect(screen.getByRole('button', { name: 'บันทึกร่าง' })).toBeDisabled()
  })

  it('edit + submit: updates then submits and shows the submitted toast (not the saved-edits one)', async () => {
    const m = makeMutations()
    m.updateMutation.mutateAsync.mockResolvedValue(pr)
    m.submitMutation.mutateAsync.mockResolvedValue(pr)
    renderForm({ mode: 'edit', prId: 3, defaultValues: prToFormValues(pr) })
    await waitFor(() => expect(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก + ส่งอนุมัติ' }))
    await waitFor(() => expect(m.submitMutation.mutateAsync).toHaveBeenCalledWith(3))
    expect(toast.success).toHaveBeenCalledWith('ส่งคำขอซื้อแล้ว')
    expect(toast.success).not.toHaveBeenCalledWith('บันทึกการแก้ไขแล้ว')
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/3')
  })
})
