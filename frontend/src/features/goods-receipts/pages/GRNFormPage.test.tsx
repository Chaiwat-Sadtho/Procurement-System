import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PurchaseOrder } from '@/features/purchase-orders/types'
import type { ReceivablePO } from '../types'

vi.mock('../hooks/useReceivablePOs', () => ({ useReceivablePOs: vi.fn() }))
vi.mock('@/features/purchase-orders/hooks/usePurchaseOrder', () => ({
  usePurchaseOrder: vi.fn(),
}))
// stub GRNForm so the host test stays focused on the picker + load seam
vi.mock('./GRNForm', () => ({
  GRNForm: (props: { po: { id: number; poNumber: string } }) => (
    <div data-testid="grnform">GRNForm|po={props.po.poNumber}</div>
  ),
}))

import { useReceivablePOs } from '../hooks/useReceivablePOs'
import { usePurchaseOrder } from '@/features/purchase-orders/hooks/usePurchaseOrder'
import { GRNFormPage } from './GRNFormPage'

const receivable: ReceivablePO[] = [
  { id: 5, poNumber: 'PO-2026-0005', vendor: { id: 2, name: 'ACME Corp' }, status: 'acknowledged' },
]

const fullPO = {
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

function setReceivable(data: ReceivablePO[] = receivable) {
  vi.mocked(useReceivablePOs).mockReturnValue({
    data,
    isLoading: false,
  } as unknown as ReturnType<typeof useReceivablePOs>)
}

// argument-sensitive: the host must thread selectedPoId into usePurchaseOrder for the
// PO to load. A static mock would render GRNForm before any pick (vacuous); this returns
// the full PO only when called with a real id (id > 0), so the click→load seam is real.
function setPO() {
  vi.mocked(usePurchaseOrder).mockImplementation(
    (id: number) =>
      ({
        data: id > 0 ? fullPO : undefined,
        isLoading: false,
        isError: false,
      }) as unknown as ReturnType<typeof usePurchaseOrder>,
  )
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GRNFormPage />
    </MemoryRouter>,
  )
}

describe('GRNFormPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the page header and a PO picker, no form before a PO is picked', () => {
    setReceivable()
    setPO()
    renderPage()
    expect(screen.getByText('บันทึกการรับของ')).toBeInTheDocument()
    expect(screen.getByTestId('grn-po-field')).toBeInTheDocument()
    expect(screen.queryByTestId('grnform')).not.toBeInTheDocument()
  })

  it('after picking a PO it loads the full PO and renders GRNForm', async () => {
    setReceivable()
    setPO()
    renderPage()
    // non-vacuous guard: no form until a PO id actually reaches usePurchaseOrder
    expect(screen.queryByTestId('grnform')).not.toBeInTheDocument()
    const trigger = within(screen.getByTestId('grn-po-field')).getByRole('combobox')
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByText(/PO-2026-0005/))
    expect(await screen.findByTestId('grnform')).toHaveTextContent('po=PO-2026-0005')
  })
})
