import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { VendorListPage } from './VendorListPage'

// Mock data hooks only — VendorListFilterForm is the REAL component, so the submit
// runs through RHF's async handleSubmit microtask and the hook's setState→effect write.
// This guards that a real-form submit actually lands q + search + page in the URL
// (wiring + the effect firing). Non-vacuity: stub commit to a no-op → this test fails.
//
// NOTE (#47, verified 2026-06-07): jsdom+RTL cannot reproduce the real-browser navigate
// no-op. Whether commit writes the URL directly in the RHF microtask or via the effect,
// the navigate still commits here (RTL flushes the microtask inside React's batching —
// deferred, never dropped). So this test does NOT distinguish the direct-write regression
// from the effect fix; that distinction is browser-only (plan Task 6 manual verify).
// See TESTING.md #47.
vi.mock('../hooks/useVendors', () => ({ useVendors: vi.fn() }))
vi.mock('../hooks/useVendorCategories', () => ({ useVendorCategories: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))

import { useVendors } from '../hooks/useVendors'
import { useVendorCategories } from '../hooks/useVendorCategories'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

function setup() {
  vi.mocked(useVendors).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useVendors>)
  vi.mocked(useVendorCategories).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useVendorCategories
  >)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<
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
        <VendorListPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { locRef }
}

describe('VendorListPage — real-form submit writes the URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('typing a name then clicking ค้นหา (real RHF async submit) lands q + search + page=1 in the URL', async () => {
    setup()
    const { locRef } = renderPage()
    await userEvent.type(screen.getByLabelText('ชื่อผู้ขาย'), 'somchai')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    await waitFor(() => {
      const params = new URLSearchParams(locRef.current)
      expect(params.get('q')).toBe('1')
      expect(params.get('search')).toBe('somchai')
      expect(params.get('page')).toBe('1')
    })
  })
})
