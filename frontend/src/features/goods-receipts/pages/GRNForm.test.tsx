import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PurchaseOrder } from '@/features/purchase-orders/types'
import { GRNForm } from './GRNForm'
import { createDefaultValues } from '../lib/grnFormSchema'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useGRNMutations', () => ({ useGRNMutations: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useGRNMutations } from '../hooks/useGRNMutations'
import { toast } from 'sonner'

const po = {
  id: 5,
  poNumber: 'PO-2026-0005',
  vendorId: 2,
  vendor: { id: 2, name: 'ACME Corp' },
  status: 'acknowledged',
  totalAmount: '1500.00',
  expectedDeliveryDate: '2026-07-01',
  actualDeliveryDate: null,
  notes: null,
  items: [
    {
      id: 201,
      poId: 5,
      prItemId: 301,
      itemName: 'A4 Paper',
      quantity: '10',
      unit: 'reams',
      unitPrice: '150.00',
      totalPrice: '1500.00',
      receivedQuantity: '0',
    },
  ],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
} as unknown as PurchaseOrder

function setMutations() {
  const createMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 42, poId: 5 }),
    isPending: false,
  }
  vi.mocked(useGRNMutations).mockReturnValue({
    createMutation,
  } as unknown as ReturnType<typeof useGRNMutations>)
  return { createMutation }
}

function renderForm() {
  return render(
    <MemoryRouter>
      <GRNForm po={po} defaultValues={createDefaultValues(po)} />
    </MemoryRouter>,
  )
}

describe('GRNForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMutations()
  })

  it('renders the read-only PO summary (poNumber + vendor) and the item line', () => {
    renderForm()
    expect(screen.getByText('PO-2026-0005')).toBeInTheDocument()
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    // the three composed sections are present (catches an accidental omission)
    expect(screen.getByText('รายการรับของ')).toBeInTheDocument() // GRNItemsField heading
    expect(screen.getByText('วันที่รับ')).toBeInTheDocument() // DateField label
    expect(screen.getByTestId('grn-receive-preview')).toBeInTheDocument()
  })

  it('seeds the good input from createDefaultValues (remaining = 10)', () => {
    renderForm()
    // scope to the 'รับสภาพดี' (good) field — not just any input displaying 10
    expect(screen.getByLabelText('รับสภาพดี')).toHaveValue(10)
  })

  it('the save button is disabled until the form is dirty and valid, then enables once a date is set', async () => {
    renderForm()
    const saveBtn = screen.getByRole('button', { name: 'บันทึก' })
    expect(saveBtn).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '01/06/2569')
    await waitFor(() => expect(saveBtn).toBeEnabled())
  })

  it('cancel button navigates back', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('submitting calls createMutation with the split payload, toasts, and navigates to detail', async () => {
    const { createMutation } = setMutations()
    renderForm()
    // fill the required date so isValid flips true
    const dateInput = screen.getByPlaceholderText('วว/ดด/ปปปป')
    await userEvent.type(dateInput, '01/06/2569') // 2026-06-01 (Buddhist year)
    const saveBtn = screen.getByRole('button', { name: 'บันทึก' })
    await userEvent.click(saveBtn)
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        poId: 5,
        receivedDate: '2026-06-01',
        items: [{ poItemId: 201, receivedQuantity: 10, condition: 'good' }],
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('บันทึกการรับของแล้ว')
    expect(mockNavigate).toHaveBeenCalledWith('/goods-receipts/42')
  })

  it('splits a part-good/part-damaged line into two DTO items (good then damaged)', async () => {
    const { createMutation } = setMutations()
    renderForm()
    // remaining = 10; receive 6 good + 4 damaged (sum at bound, valid)
    const good = screen.getByLabelText('รับสภาพดี')
    await userEvent.clear(good)
    await userEvent.type(good, '6')
    await userEvent.type(screen.getByLabelText('ชำรุด'), '4')
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '01/06/2569')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { poItemId: 201, receivedQuantity: 6, condition: 'good' },
          { poItemId: 201, receivedQuantity: 4, condition: 'damaged' },
        ],
      }),
    )
  })

  it('shows an error toast and does not navigate when the create mutation fails', async () => {
    const createMutation = {
      mutateAsync: vi.fn().mockRejectedValue(new Error('boom')),
      isPending: false,
    }
    vi.mocked(useGRNMutations).mockReturnValue({
      createMutation,
    } as unknown as ReturnType<typeof useGRNMutations>)
    renderForm()
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '01/06/2569')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('เกิดข้อผิดพลาด'))
    expect(toast.success).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalledWith('/goods-receipts/42')
  })

  // characterization for the watch('items') -> useWatch swap: the receive-outcome
  // preview is derived from the live good/remaining per line, so editing 'good' must
  // re-evaluate it. A broken items subscription would leave the outcome stale.
  it('the receive-outcome preview updates live as the good qty changes (watch items)', async () => {
    renderForm()
    // default good = remaining = 10 → whole GRN will complete
    expect(screen.getByTestId('grn-receive-outcome')).toHaveTextContent('รับครบถ้วน → PO completed')
    // drop good below remaining → partially received
    const good = screen.getByLabelText('รับสภาพดี')
    await userEvent.clear(good)
    await userEvent.type(good, '6')
    // synchronous assert (no waitFor): useWatch('items') reflects the live good qty
    // within the same act() flush — the outcome is not one render stale.
    expect(screen.getByTestId('grn-receive-outcome')).toHaveTextContent(
      'รับไม่ครบ → partially_received',
    )
  })

  it('ignores a second submit while the first is in flight (inFlight guard)', async () => {
    // a never-resolving mutation keeps the first submit "in flight" so the
    // synchronous inFlight ref must swallow the second click (isPending stays false here)
    let resolve: (v: { id: number; poId: number }) => void = () => {}
    const pending = new Promise<{ id: number; poId: number }>((r) => {
      resolve = r
    })
    const createMutation = { mutateAsync: vi.fn().mockReturnValue(pending), isPending: false }
    vi.mocked(useGRNMutations).mockReturnValue({
      createMutation,
    } as unknown as ReturnType<typeof useGRNMutations>)
    renderForm()
    await userEvent.type(screen.getByPlaceholderText('วว/ดด/ปปปป'), '01/06/2569')
    const saveBtn = screen.getByRole('button', { name: 'บันทึก' })
    await userEvent.click(saveBtn)
    await waitFor(() => expect(createMutation.mutateAsync).toHaveBeenCalledTimes(1))
    await userEvent.click(saveBtn)
    expect(createMutation.mutateAsync).toHaveBeenCalledTimes(1)
    resolve({ id: 42, poId: 5 })
  })
})
