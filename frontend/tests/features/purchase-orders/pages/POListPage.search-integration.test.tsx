import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { POListPage } from '@/features/purchase-orders/pages/POListPage'

// Mock data hooks only — POListFilterForm is the REAL component, so the submit runs
// through RHF's async handleSubmit microtask and the hook's setState→effect write. This
// guards that a real-form submit actually lands q + status + page in the URL (wiring +
// the effect firing). Non-vacuity: stub the page's commit to a no-op → this test fails.
//
// NOTE (#47, TESTING.md): jsdom+RTL cannot reproduce the real-browser navigate no-op.
// Whether commit writes the URL directly in the RHF microtask or via the effect, the
// navigate still commits here (RTL flushes the microtask inside React's batching). So this
// test does NOT distinguish the direct-write regression from the effect fix; that
// distinction is browser-only (verify-live, tools/eyeball).
vi.mock('@/features/purchase-orders/hooks/usePurchaseOrders', () => ({ usePurchaseOrders: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/vendors/hooks/useVendors', () => ({ useVendors: vi.fn() }))

import { usePurchaseOrders } from '@/features/purchase-orders/hooks/usePurchaseOrders'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useVendors } from '@/features/vendors/hooks/useVendors'

function setup() {
  vi.mocked(usePurchaseOrders).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePurchaseOrders>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
  vi.mocked(useVendors).mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useVendors
  >)
}

function renderPage(initialEntries: string[] = ['/']) {
  const locRef = { current: '' }
  function LocationProbe() {
    const loc = useLocation()
    useEffect(() => {
      locRef.current = loc.search
    }, [loc])
    return null
  }
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <POListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { locRef }
}

describe('POListPage — real-form submit writes the URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('choosing a status then clicking ค้นหา (real RHF async submit) lands q + status + page=1 in the URL', async () => {
    setup()
    const { locRef } = renderPage()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'ส่งแล้ว' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    await waitFor(() => {
      const params = new URLSearchParams(locRef.current)
      expect(params.get('q')).toBe('1')
      expect(params.get('status')).toBe('sent')
      expect(params.get('page')).toBe('1')
    })
  })
})
