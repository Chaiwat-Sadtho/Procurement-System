import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { PurchaseOrder } from '@/features/purchase-orders/types'
import type { ReceivablePO } from '../types'
import { createDefaultValues } from '../lib/grnFormSchema'

vi.mock('../hooks/useReceivablePOs', () => ({ useReceivablePOs: vi.fn() }))
vi.mock('@/features/purchase-orders/hooks/usePurchaseOrder', () => ({
  usePurchaseOrder: vi.fn(),
}))
// stub GRNForm so the host test stays focused on the picker + load seam. Expose the wired
// props (po + the computed defaultValues) so the test can prove the host threads
// createDefaultValues(pickedPO) through — not a stale or empty default.
vi.mock('./GRNForm', () => ({
  GRNForm: (props: {
    po: { id: number; poNumber: string }
    defaultValues: { poId: number; items: unknown[] }
  }) => (
    <div
      data-testid="grnform"
      data-poid={props.defaultValues.poId}
      data-itemcount={props.defaultValues.items.length}
    >
      GRNForm|po={props.po.poNumber}
    </div>
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

// argument-sensitive PO load mock: the requested state only materialises once a real PO id
// (id > 0) reaches the hook, so the click→load seam stays non-vacuous (a static mock would
// render GRNForm before any pick). `over` drives the picked PO's outcome: loaded / loading / error.
function setPO(over: { data?: unknown; isLoading?: boolean; isError?: boolean } = { data: fullPO }) {
  vi.mocked(usePurchaseOrder).mockImplementation(
    (id: number) =>
      ({
        data: id > 0 ? (over.data ?? undefined) : undefined,
        isLoading: id > 0 ? (over.isLoading ?? false) : false,
        isError: id > 0 ? (over.isError ?? false) : false,
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

// getByLabelText proves <Label htmlFor="grn-po"> binds the Combobox trigger (id="grn-po"),
// i.e. the picker is reachable by its visible label, not just a bare role.
async function pickPO(option: RegExp = /PO-2026-0005/) {
  await userEvent.click(screen.getByLabelText('ใบสั่งซื้อ (PO)'))
  await userEvent.click(await screen.findByText(option))
}

describe('GRNFormPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the page header and a labelled PO picker, no form before a PO is picked', () => {
    setReceivable()
    setPO()
    renderPage()
    expect(screen.getByText('บันทึกการรับของ')).toBeInTheDocument()
    expect(screen.getByLabelText('ใบสั่งซื้อ (PO)')).toBeInTheDocument()
    expect(screen.queryByTestId('grnform')).not.toBeInTheDocument()
  })

  it('after picking a PO it loads that PO and renders GRNForm seeded from it', async () => {
    setReceivable()
    setPO({ data: fullPO })
    renderPage()
    // non-vacuous guard: no form until a PO id actually reaches usePurchaseOrder
    expect(screen.queryByTestId('grnform')).not.toBeInTheDocument()
    await pickPO()
    const form = await screen.findByTestId('grnform')
    expect(form).toHaveTextContent('po=PO-2026-0005')
    // the host must thread createDefaultValues(pickedPO), not a stale/empty default
    const expected = createDefaultValues(fullPO)
    expect(form).toHaveAttribute('data-poid', String(expected.poId))
    expect(form).toHaveAttribute('data-itemcount', String(expected.items.length))
  })

  it('shows the full "PO — vendor" label in the picker options', async () => {
    setReceivable()
    setPO()
    renderPage()
    await userEvent.click(screen.getByLabelText('ใบสั่งซื้อ (PO)'))
    expect(await screen.findByText('PO-2026-0005 — ACME Corp')).toBeInTheDocument()
  })

  it('shows a loading spinner while the picked PO is loading', async () => {
    setReceivable()
    setPO({ data: undefined, isLoading: true })
    renderPage()
    await pickPO()
    expect(await screen.findByTestId('grn-po-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('grnform')).not.toBeInTheDocument()
  })

  it('shows an error alert and no form when the picked PO fails to load', async () => {
    setReceivable()
    setPO({ data: undefined, isError: true })
    renderPage()
    await pickPO()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('โหลดใบสั่งซื้อไม่สำเร็จ')
    expect(screen.queryByTestId('grnform')).not.toBeInTheDocument()
  })
})
