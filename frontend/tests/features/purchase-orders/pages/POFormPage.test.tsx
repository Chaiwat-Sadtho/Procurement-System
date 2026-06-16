import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { PurchaseOrder } from '@/features/purchase-orders/types'

vi.mock('@/features/purchase-orders/hooks/usePurchaseOrder', () => ({ usePurchaseOrder: vi.fn() }))
// Mock mirrors POForm's real contract: prId/vendorId are numbers (poFormSchema =
// z.number), and create/edit both carry an items array. Rendering more than prId lets
// the prefill test prove the WHOLE poToFormValues transform, not just one field.
vi.mock('@/features/purchase-orders/components/POForm', () => ({
  POForm: (props: {
    mode: 'create' | 'edit'
    defaultValues: { prId: number; vendorId: number; items: unknown[] }
  }) => (
    <div data-testid="poform">
      mode={props.mode}|prId={props.defaultValues.prId}|vendorId=
      {props.defaultValues.vendorId}|items={props.defaultValues.items.length}
    </div>
  ),
}))

import { usePurchaseOrder } from '@/features/purchase-orders/hooks/usePurchaseOrder'
import { POFormPage } from '@/features/purchase-orders/pages/POFormPage'

function setPO(over: Partial<{ data: unknown; isLoading: boolean; isError: boolean }>) {
  vi.mocked(usePurchaseOrder).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...over,
  } as ReturnType<typeof usePurchaseOrder>)
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/purchase-orders/new" element={<POFormPage />} />
        <Route path="/purchase-orders/:id/edit" element={<POFormPage />} />
        <Route path="/purchase-orders/:id" element={<div>DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const draftPO = {
  id: 3,
  poNumber: 'PO-2026-0003',
  prId: 5,
  vendorId: 2,
  status: 'draft',
  totalAmount: '1500.00',
  expectedDeliveryDate: '2026-07-01',
  actualDeliveryDate: null,
  notes: null,
  items: [
    {
      id: 101,
      poId: 3,
      prItemId: 201,
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

describe('POFormPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create mode renders the create header + POForm with a schema-valid empty default', () => {
    setPO({ data: undefined })
    renderAt('/purchase-orders/new')
    expect(screen.getByText('สร้างใบสั่งซื้อ')).toBeInTheDocument()
    const form = screen.getByTestId('poform')
    expect(form).toHaveTextContent('mode=create')
    // createDefaultValues seeds exactly one blank item so the form starts schema-valid (items >= 1)
    expect(form).toHaveTextContent('items=1')
  })

  it('edit mode (draft) renders the edit header + POForm fully prefilled from poToFormValues', () => {
    setPO({ data: draftPO })
    renderAt('/purchase-orders/3/edit')
    expect(screen.getByText('แก้ไข PO-2026-0003')).toBeInTheDocument()
    const form = screen.getByTestId('poform')
    expect(form).toHaveTextContent('mode=edit')
    // assert the whole transform, not just prId: a wrong defaultValues (e.g. createDefaultValues)
    // would render prId=0|vendorId=0, and a dropped items array would render items=0
    expect(form).toHaveTextContent('prId=5')
    expect(form).toHaveTextContent('vendorId=2')
    expect(form).toHaveTextContent('items=1')
  })

  it('edit mode shows a spinner while loading', () => {
    setPO({ isLoading: true })
    renderAt('/purchase-orders/3/edit')
    expect(screen.queryByTestId('poform')).not.toBeInTheDocument()
  })

  it('edit mode shows not-found on error', () => {
    setPO({ isError: true })
    renderAt('/purchase-orders/3/edit')
    expect(screen.getByText('ไม่พบใบสั่งซื้อ')).toBeInTheDocument()
  })

  it('edit mode shows not-found when the query settles with no PO and no error', () => {
    setPO({ data: undefined, isLoading: false, isError: false })
    renderAt('/purchase-orders/3/edit')
    expect(screen.getByText('ไม่พบใบสั่งซื้อ')).toBeInTheDocument()
  })

  it('edit mode blocks a non-draft PO', () => {
    setPO({ data: { ...draftPO, status: 'sent' } })
    renderAt('/purchase-orders/3/edit')
    expect(screen.getByText('แก้ไขได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่าง')).toBeInTheDocument()
    expect(screen.queryByTestId('poform')).not.toBeInTheDocument()
  })
})
