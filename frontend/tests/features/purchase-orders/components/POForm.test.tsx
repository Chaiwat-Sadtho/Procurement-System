import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { POForm } from '@/features/purchase-orders/components/POForm'
import { createDefaultValues } from '@/features/purchase-orders/lib/poFormSchema'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/features/purchase-orders/hooks/usePOMutations', () => ({ usePOMutations: vi.fn() }))
vi.mock('@/features/purchase-orders/hooks/useEligiblePRs', () => ({ useEligiblePRs: vi.fn() }))
vi.mock('@/features/purchase-orders/hooks/useBudgetForPR', () => ({
  useBudgetForPR: vi.fn(),
  matchBudgetForPR: vi.fn(() => undefined),
}))
vi.mock('@/features/vendors/hooks/useVendors', () => ({ useVendors: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { usePOMutations } from '@/features/purchase-orders/hooks/usePOMutations'
import { useEligiblePRs } from '@/features/purchase-orders/hooks/useEligiblePRs'
import { useBudgetForPR, matchBudgetForPR } from '@/features/purchase-orders/hooks/useBudgetForPR'
import { useVendors } from '@/features/vendors/hooks/useVendors'
import { toast } from 'sonner'

const eligiblePR = {
  id: 5,
  prNumber: 'PR-2026-0005',
  title: 'Office Supplies',
  status: 'approved',
  totalEstimatedAmount: 1500,
  quarter: 2,
  requiredDate: '2026-07-01',
  requesterId: 10,
  requester: { id: 10, fullName: 'Emp', email: 'e@x.com' },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: 2,
  approver: null,
  approvedAt: '2026-06-01T00:00:00Z',
  rejectReason: null,
  items: [
    {
      id: 201,
      prId: 5,
      itemName: 'A4 Paper',
      description: null,
      quantity: 10,
      unit: 'reams',
      estimatedUnitPrice: 150,
      estimatedTotalPrice: 1500,
    },
  ],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
}

function setMutations() {
  const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 7 }), isPending: false }
  const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 3 }), isPending: false }
  vi.mocked(usePOMutations).mockReturnValue({
    createMutation,
    updateMutation,
  } as unknown as ReturnType<typeof usePOMutations>)
  return { createMutation, updateMutation }
}

function setHooks() {
  vi.mocked(useEligiblePRs).mockReturnValue({
    data: { data: [eligiblePR], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } },
    isLoading: false,
  } as unknown as ReturnType<typeof useEligiblePRs>)
  vi.mocked(useBudgetForPR).mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof useBudgetForPR>)
  // real useVendors returns the paginated { data: { data, meta } } shape
  vi.mocked(useVendors).mockReturnValue({
    data: {
      data: [{ id: 2, name: 'ACME Corp', isBlacklisted: false }],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useVendors>)
}

function renderForm(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const editDefaults = {
  prId: 5,
  vendorId: 2,
  expectedDeliveryDate: '2026-07-01',
  notes: '',
  items: [{ prItemId: 201, itemName: 'A4 Paper', quantity: '10', unit: 'reams', unitPrice: '150' }],
}

describe('POForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMutations()
    setHooks()
  })

  it('create mode: selecting a PR copies its items into the form (unitPrice from estimatedUnitPrice)', async () => {
    renderForm(<POForm mode="create" defaultValues={createDefaultValues()} />)
    const prTrigger = within(screen.getByTestId('po-pr-field')).getByRole('combobox')
    await userEvent.click(prTrigger)
    await userEvent.click(await screen.findByText(/PR-2026-0005/))
    expect(await screen.findByDisplayValue('A4 Paper')).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
  })

  it('create mode: shows the PR info (department) after picking', async () => {
    renderForm(<POForm mode="create" defaultValues={createDefaultValues()} />)
    const prTrigger = within(screen.getByTestId('po-pr-field')).getByRole('combobox')
    await userEvent.click(prTrigger)
    await userEvent.click(await screen.findByText(/PR-2026-0005/))
    expect(await screen.findByText('IT')).toBeInTheDocument()
  })

  it('create mode: the save button is disabled until the form is dirty and valid', () => {
    renderForm(<POForm mode="create" defaultValues={createDefaultValues()} />)
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
  })

  it('edit mode: the PR and vendor pickers are disabled (immutable)', () => {
    renderForm(<POForm mode="edit" poId={3} defaultValues={editDefaults} />)
    expect(within(screen.getByTestId('po-pr-field')).getByRole('combobox')).toBeDisabled()
    expect(within(screen.getByTestId('po-vendor-field')).getByRole('combobox')).toBeDisabled()
  })

  it('edit mode: submitting calls updateMutation, toasts, and navigates to detail', async () => {
    const { updateMutation } = setMutations()
    renderForm(<POForm mode="edit" poId={3} defaultValues={editDefaults} />)
    // make the form dirty so the save button enables
    const notes = screen.getByLabelText(/หมายเหตุ/i)
    await userEvent.type(notes, 'rush order')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    expect(updateMutation.mutateAsync).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('บันทึกการแก้ไขแล้ว')
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-orders/3')
  })

  it('cancel button navigates back', async () => {
    renderForm(<POForm mode="create" defaultValues={createDefaultValues()} />)
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('mounts the budget preview region', () => {
    renderForm(<POForm mode="create" defaultValues={createDefaultValues()} />)
    expect(screen.getByTestId('po-budget-preview')).toBeInTheDocument()
  })
})

// F1: in edit mode the edited PO's PR already has an active PO, so the backend's
// eligibleForPo filter excludes it from the picker list. The form must still resolve
// the PR (summary card + budget preview) from the PO's own purchaseRequest ref.
const editPrRef = {
  id: 5,
  prNumber: 'PR-2026-0005',
  quarter: 2,
  fiscalYear: 2026,
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  totalEstimatedAmount: '1500',
}

describe('POForm — edit mode resolves PR from the PO, not the eligible list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMutations()
    setHooks()
    // realistic: the edited PR is absent from the eligible list (it has an active PO)
    vi.mocked(useEligiblePRs).mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof useEligiblePRs>)
  })

  it('shows the PR summary card from the PO PR even when it is absent from the eligible list', () => {
    renderForm(<POForm mode="edit" poId={3} defaultValues={editDefaults} pr={editPrRef} />)
    // the PR number now appears in both the (populated) disabled picker and the summary card
    expect(screen.getAllByText('PR-2026-0005').length).toBeGreaterThan(0)
    // department renders only inside the summary card, which was previously missing entirely
    expect(screen.getByText('IT')).toBeInTheDocument()
  })

  it('resolves the budget preview from the PO PR (renders budget rows, not the not-set fallback)', () => {
    vi.mocked(matchBudgetForPR).mockReturnValue({
      totalAmount: '100000',
      reservedAmount: '10000',
      usedAmount: '0',
    } as unknown as ReturnType<typeof matchBudgetForPR>)
    vi.mocked(useBudgetForPR).mockReturnValue({
      data: [{ totalAmount: '100000', reservedAmount: '10000', usedAmount: '0' }],
      isLoading: false,
    } as unknown as ReturnType<typeof useBudgetForPR>)

    renderForm(<POForm mode="edit" poId={3} defaultValues={editDefaults} pr={editPrRef} />)
    expect(screen.getByTestId('po-budget-remaining-after')).toBeInTheDocument()
    expect(screen.queryByText('งบประมาณยังไม่ถูกกำหนด')).not.toBeInTheDocument()
  })

  // characterization for the watch('items') -> useWatch swap: the budget preview's
  // remaining-after is derived from the live PO total, so editing a quantity must
  // recompute it. A broken items subscription would leave it pinned at the initial value.
  it('budget preview reflects the live PO total as item quantities change (watch items)', async () => {
    vi.mocked(matchBudgetForPR).mockReturnValue({
      totalAmount: '100000',
      reservedAmount: '10000',
      usedAmount: '0',
    } as unknown as ReturnType<typeof matchBudgetForPR>)
    vi.mocked(useBudgetForPR).mockReturnValue({
      data: [{ totalAmount: '100000', reservedAmount: '10000', usedAmount: '0' }],
      isLoading: false,
    } as unknown as ReturnType<typeof useBudgetForPR>)

    renderForm(<POForm mode="edit" poId={3} defaultValues={editDefaults} pr={editPrRef} />)
    // initial: poTotal = 10 × 150 = 1500 = prEstimate → delta 0 → remainingAfter = remaining = 90,000
    expect(screen.getByTestId('po-budget-remaining-after')).toHaveTextContent('90,000')

    // bump quantity 10 → 20: poTotal 3000, delta +1500 → remainingAfter 88,500
    const qty = screen.getByDisplayValue('10')
    await userEvent.clear(qty)
    await userEvent.type(qty, '20')
    // synchronous assert (no waitFor): useWatch('items') updates within the same act()
    // flush as the input change, so the budget total is never one render behind the
    // sibling POItemsField's form.watch('items'). No transient stale value.
    expect(screen.getByTestId('po-budget-remaining-after')).toHaveTextContent('88,500')
  })
})
