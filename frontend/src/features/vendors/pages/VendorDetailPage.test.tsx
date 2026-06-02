import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { Vendor } from '../types'
import type { User } from '@/shared/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useVendor', () => ({ useVendor: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useVendor } from '../hooks/useVendor'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { toast } from 'sonner'
import { VendorDetailPage } from './VendorDetailPage'

const mockVendor: Vendor = {
  id: 1, name: 'ACME Corp', taxId: '0105551234567', email: 'a@x.com', phone: '021234567',
  address: 'Bangkok', isBlacklisted: false, blacklistReason: null, ratingAvg: '4.50',
  categories: [{ id: 1, name: 'Hardware' }], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

const poUser: User = {
  id: 10, email: 'po@x.com', firstName: 'P', middleName: null, lastName: 'O', fullName: 'PO',
  role: 'procurement_officer', isActive: true, departmentId: 1,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

function mockHook(overrides: Partial<Record<string, unknown>> = {}) {
  const blacklistMutation = { mutate: vi.fn(), isPending: false }
  const unblacklistMutation = { mutate: vi.fn(), isPending: false }
  vi.mocked(useVendor).mockReturnValue({
    data: mockVendor,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    blacklistMutation,
    unblacklistMutation,
    ...overrides,
  } as unknown as ReturnType<typeof useVendor>)
  return { blacklistMutation, unblacklistMutation }
}

function setUser(user: User | undefined = poUser) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/vendors/${id}`]}>
      <Routes>
        <Route path="/vendors/:id" element={<VendorDetailPage />} />
        <Route path="/vendors" element={<div>LIST PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VendorDetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the loading skeleton while fetching', () => {
    mockHook({ data: undefined, isLoading: true })
    setUser()
    renderPage()
    expect(screen.getByTestId('vendor-detail-loading')).toBeInTheDocument()
  })

  it('shows an error alert with a back link when isError', () => {
    mockHook({ data: undefined, isError: true })
    setUser()
    renderPage()
    expect(screen.getByText(/ไม่พบผู้ขาย/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับไปรายการ' })).toBeInTheDocument()
  })

  it('shows an error alert for an invalid id', () => {
    mockHook({ data: undefined })
    setUser()
    renderPage('abc')
    expect(screen.getByText(/ไม่พบผู้ขาย/)).toBeInTheDocument()
  })

  it('renders the header and PO actions on success', () => {
    mockHook()
    setUser()
    renderPage()
    expect(screen.getByRole('heading', { name: 'ACME Corp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แก้ไข' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แบล็คลิสต์' })).toBeInTheDocument()
  })

  it('hides action buttons for a manager (read-only)', () => {
    mockHook()
    setUser({ ...poUser, role: 'manager' })
    renderPage()
    expect(screen.getByRole('heading', { name: 'ACME Corp' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'แบล็คลิสต์' })).not.toBeInTheDocument()
  })

  it('navigates to the edit route when แก้ไข is clicked', async () => {
    mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
    expect(mockNavigate).toHaveBeenCalledWith('/vendors/1/edit')
  })

  it('blacklist flow: opens reason dialog and calls blacklistMutation with the reason', async () => {
    const { blacklistMutation } = mockHook()
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'แบล็คลิสต์' }))
    await userEvent.type(screen.getByLabelText('เหตุผล'), 'ส่งของช้า')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันแบล็คลิสต์' }))
    expect(blacklistMutation.mutate).toHaveBeenCalledWith('ส่งของช้า', expect.anything())
  })

  it('shows a success toast when blacklist succeeds', async () => {
    const { blacklistMutation } = mockHook()
    blacklistMutation.mutate.mockImplementation((_r: string, opts: { onSuccess: () => void }) => opts.onSuccess())
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'แบล็คลิสต์' }))
    await userEvent.type(screen.getByLabelText('เหตุผล'), 'ส่งของช้า')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันแบล็คลิสต์' }))
    expect(toast.success).toHaveBeenCalledWith('แบล็คลิสต์ผู้ขายแล้ว')
  })

  it('unblacklist flow: confirm then calls unblacklistMutation', async () => {
    const { unblacklistMutation } = mockHook({ data: { ...mockVendor, isBlacklisted: true } })
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิกแบล็คลิสต์' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
    expect(unblacklistMutation.mutate).toHaveBeenCalledWith(undefined, expect.anything())
  })

  it('shows an error toast when a mutation fails', async () => {
    const { blacklistMutation } = mockHook()
    blacklistMutation.mutate.mockImplementation((_r: string, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new Error('x')),
    )
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'แบล็คลิสต์' }))
    await userEvent.type(screen.getByLabelText('เหตุผล'), 'ส่งของช้า')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันแบล็คลิสต์' }))
    expect(toast.error).toHaveBeenCalledWith('เกิดข้อผิดพลาด')
  })

  it('shows a success toast when unblacklist succeeds', async () => {
    const { unblacklistMutation } = mockHook({ data: { ...mockVendor, isBlacklisted: true } })
    unblacklistMutation.mutate.mockImplementation((_v: undefined, opts: { onSuccess: () => void }) => opts.onSuccess())
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิกแบล็คลิสต์' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
    expect(toast.success).toHaveBeenCalledWith('ยกเลิกแบล็คลิสต์แล้ว')
  })

  it('shows an error toast when unblacklist fails', async () => {
    const { unblacklistMutation } = mockHook({ data: { ...mockVendor, isBlacklisted: true } })
    unblacklistMutation.mutate.mockImplementation((_v: undefined, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new Error('x')),
    )
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิกแบล็คลิสต์' }))
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
    expect(toast.error).toHaveBeenCalledWith('เกิดข้อผิดพลาด')
  })

  it('error state: the ลองใหม่ button calls refetch', async () => {
    const refetch = vi.fn()
    mockHook({ data: undefined, isError: true, refetch })
    setUser()
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('invalid id state: shows no ลองใหม่ button (query is disabled, nothing to retry)', () => {
    mockHook({ data: undefined })
    setUser()
    renderPage('abc')
    expect(screen.queryByRole('button', { name: 'ลองใหม่' })).not.toBeInTheDocument()
  })
})
