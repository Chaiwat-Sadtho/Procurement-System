import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { POForm } from './POForm'
import { createDefaultValues } from '../lib/poFormSchema'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/usePOMutations', () => ({ usePOMutations: vi.fn() }))
vi.mock('../hooks/useEligiblePRs', () => ({ useEligiblePRs: vi.fn() }))
vi.mock('../hooks/useBudgetForPR', () => ({
  useBudgetForPR: vi.fn(),
  matchBudgetForPR: vi.fn(() => undefined),
}))
vi.mock('@/features/vendors/hooks/useVendors', () => ({ useVendors: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { usePOMutations } from '../hooks/usePOMutations'
import { useEligiblePRs } from '../hooks/useEligiblePRs'
import { useBudgetForPR } from '../hooks/useBudgetForPR'
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
  items: [
    { prItemId: 201, itemName: 'A4 Paper', quantity: '10', unit: 'reams', unitPrice: '150' },
  ],
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
