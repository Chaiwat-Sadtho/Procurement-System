import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { PurchaseRequest } from '../types'
import type { User } from '@/shared/types'

vi.mock('../hooks/usePurchaseRequest', () => ({ usePurchaseRequest: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../components/PRForm', () => ({
  PRForm: (props: { mode: string; defaultValues: { title: string } }) => (
    <div data-testid="prform">mode={props.mode}|title={props.defaultValues.title}</div>
  ),
}))

import { usePurchaseRequest } from '../hooks/usePurchaseRequest'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { PRFormPage } from './PRFormPage'

const owner = { id: 10, role: 'employee' } as User

function setUser(user: User | undefined = owner) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
}
function setPR(over: Partial<{ data: unknown; isLoading: boolean; isError: boolean }>) {
  vi.mocked(usePurchaseRequest).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...over,
  } as ReturnType<typeof usePurchaseRequest>)
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/purchase-requests/new" element={<PRFormPage />} />
        <Route path="/purchase-requests/:id/edit" element={<PRFormPage />} />
        <Route path="/purchase-requests/:id" element={<div>DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const draftPR = {
  id: 3, title: 'ของเดิม', status: 'draft', requesterId: 10, quarter: 2, requiredDate: '2026-08-15',
  items: [{ id: 1, prId: 3, itemName: 'หมึก', description: null, quantity: 5, unit: 'กล่อง', estimatedUnitPrice: 300, estimatedTotalPrice: 1500 }],
} as unknown as PurchaseRequest

describe('PRFormPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create mode renders PRForm with mode=create', () => {
    setUser()
    setPR({ data: undefined })
    renderAt('/purchase-requests/new')
    expect(screen.getByTestId('prform')).toHaveTextContent('mode=create')
  })

  it('edit mode (draft + owner) renders PRForm with mode=edit prefilled', () => {
    setUser(owner)
    setPR({ data: draftPR })
    renderAt('/purchase-requests/3/edit')
    expect(screen.getByTestId('prform')).toHaveTextContent('mode=edit')
    expect(screen.getByTestId('prform')).toHaveTextContent('title=ของเดิม')
  })

  it('edit mode shows spinner while loading', () => {
    setUser()
    setPR({ isLoading: true })
    renderAt('/purchase-requests/3/edit')
    expect(screen.queryByTestId('prform')).not.toBeInTheDocument()
  })

  it('edit mode shows not-found on error', () => {
    setUser()
    setPR({ isError: true })
    renderAt('/purchase-requests/3/edit')
    expect(screen.getByText('ไม่พบใบขอซื้อ')).toBeInTheDocument()
  })

  it('edit mode blocks a non-draft PR', () => {
    setUser(owner)
    setPR({ data: { ...draftPR, status: 'submitted' } })
    renderAt('/purchase-requests/3/edit')
    expect(screen.getByText('แก้ไขได้เฉพาะใบร่างของคุณ')).toBeInTheDocument()
    expect(screen.queryByTestId('prform')).not.toBeInTheDocument()
  })

  it('edit mode blocks a non-owner', () => {
    setUser({ id: 99, role: 'employee' } as User)
    setPR({ data: draftPR })
    renderAt('/purchase-requests/3/edit')
    expect(screen.getByText('แก้ไขได้เฉพาะใบร่างของคุณ')).toBeInTheDocument()
  })
})
