import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { PRListPage } from '@/features/purchase-requests/pages/PRListPage'

// Mock data hooks only — PRListFilterForm is the REAL component, so the submit runs
// through RHF's async handleSubmit microtask and the hook's setState→effect write.
// This guards that a real-form submit actually lands q + the filters + page in the URL
// (wiring + the effect firing). Non-vacuity: stub commit to a no-op → this test fails.
//
// NOTE: jsdom+RTL cannot reproduce the real-browser navigate no-op. Whether commit writes
// the URL directly in the RHF microtask or via the effect, the navigate still commits here
// (RTL flushes the microtask inside React's batching — deferred, never dropped). So this
// test does NOT distinguish the direct-write regression from the effect fix; that
// distinction is browser-only (manual verify).
vi.mock('@/features/purchase-requests/hooks/usePurchaseRequests', () => ({ usePurchaseRequests: vi.fn() }))
vi.mock('@/features/purchase-requests/hooks/usePRMutations', () => ({ usePRMutations: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))

import { usePurchaseRequests } from '@/features/purchase-requests/hooks/usePurchaseRequests'
import { usePRMutations } from '@/features/purchase-requests/hooks/usePRMutations'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import type { User } from '@/shared/types'

const managerUser = {
  id: 1,
  role: 'manager',
  fullName: 'Test Manager',
} as unknown as User

function setup() {
  vi.mocked(usePurchaseRequests).mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof usePurchaseRequests>)
  vi.mocked(usePRMutations).mockReturnValue({
    deleteMutation: { mutate: vi.fn(), isPending: false },
  } as unknown as ReturnType<typeof usePRMutations>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: managerUser } as ReturnType<
    typeof useCurrentUser
  >)
}

function renderPage(initialEntries: string[] = ['/']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const locRef = { current: '' }
  function LocationProbe() {
    const loc = useLocation()
    useEffect(() => {
      locRef.current = loc.search
    }, [loc])
    return null
  }
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <PRListPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { locRef }
}

describe('PRListPage — real-form submit writes the URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filling dates + status then clicking ค้นหา (real RHF async submit) lands q + filters + page=1 in the URL', async () => {
    setup()
    const { locRef } = renderPage()

    await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '01012569')
    const to = screen.getByLabelText(/วันที่สิ้นสุด/i)
    await userEvent.clear(to)
    await userEvent.type(to, '31122569')
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'อนุมัติแล้ว' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))

    await waitFor(() => {
      const params = new URLSearchParams(locRef.current)
      expect(params.get('q')).toBe('1')
      expect(params.get('from')).toBe('2026-01-01')
      expect(params.get('to')).toBe('2026-12-31')
      expect(params.get('status')).toBe('approved')
      expect(params.get('page')).toBe('1')
    })
  })
})
