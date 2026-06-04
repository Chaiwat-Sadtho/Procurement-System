import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  })

  it('seeds the good input from createDefaultValues (remaining = 10)', () => {
    renderForm()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('the save button is disabled until the form is dirty and valid (no date yet)', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
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
})
