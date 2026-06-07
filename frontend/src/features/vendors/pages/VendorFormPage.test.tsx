import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { Vendor } from '../types'

vi.mock('../hooks/useVendor', () => ({ useVendor: vi.fn() }))
vi.mock('../components/VendorForm', () => ({
  VendorForm: (props: { mode: string; defaultValues: { name: string } }) => (
    <div data-testid="vendorform">
      mode={props.mode}|name={props.defaultValues.name}
    </div>
  ),
}))

import { useVendor } from '../hooks/useVendor'
import { VendorFormPage } from './VendorFormPage'

function setVendor(over: Partial<{ data: unknown; isLoading: boolean; isError: boolean }>) {
  vi.mocked(useVendor).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...over,
  } as ReturnType<typeof useVendor>)
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vendors/new" element={<VendorFormPage />} />
        <Route path="/vendors/:id/edit" element={<VendorFormPage />} />
        <Route path="/vendors/:id" element={<div>DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const vendor = {
  id: 3,
  name: 'OldCo',
  taxId: null,
  email: null,
  phone: null,
  address: null,
  isBlacklisted: false,
  blacklistReason: null,
  ratingAvg: null,
  categories: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as Vendor

describe('VendorFormPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create mode renders VendorForm with mode=create', () => {
    setVendor({ data: undefined })
    renderAt('/vendors/new')
    expect(screen.getByTestId('vendorform')).toHaveTextContent('mode=create')
  })

  it('edit mode renders VendorForm with mode=edit prefilled', () => {
    setVendor({ data: vendor })
    renderAt('/vendors/3/edit')
    expect(screen.getByTestId('vendorform')).toHaveTextContent('mode=edit')
    expect(screen.getByTestId('vendorform')).toHaveTextContent('name=OldCo')
  })

  it('edit mode shows a spinner while loading', () => {
    setVendor({ isLoading: true })
    renderAt('/vendors/3/edit')
    expect(screen.queryByTestId('vendorform')).not.toBeInTheDocument()
  })

  it('edit mode shows not-found on error', () => {
    setVendor({ isError: true })
    renderAt('/vendors/3/edit')
    expect(screen.getByText('ไม่พบผู้ขาย')).toBeInTheDocument()
  })

  it('edit mode shows not-found when the query settles with no vendor and no error', () => {
    // covers the `!vendor` operand of `isError || !vendor` (query resolved empty, not erroring)
    setVendor({ data: undefined, isLoading: false, isError: false })
    renderAt('/vendors/3/edit')
    expect(screen.getByText('ไม่พบผู้ขาย')).toBeInTheDocument()
  })
})
