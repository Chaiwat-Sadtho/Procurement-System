import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { GRNListPage } from '@/features/goods-receipts/pages/GRNListPage'

// Mock data hooks only — GRNListFilterForm is the REAL component, so the submit runs
// through RHF's async handleSubmit microtask and the hook's setState→effect write. This
// guards that a real-form submit actually lands q + status + page in the URL (wiring +
// the effect firing). Non-vacuity: stub the page's commit to a no-op → this test fails.
//
// NOTE (#47, TESTING.md): jsdom+RTL cannot reproduce the real-browser navigate no-op.
// Whether commit writes the URL directly in the RHF microtask or via the effect, the
// navigate still commits here (RTL flushes the microtask inside React's batching). So this
// test does NOT distinguish the direct-write regression from the effect fix; that
// distinction is browser-only (verify-live, tools/eyeball).
vi.mock('@/features/goods-receipts/hooks/useGoodsReceipts', () => ({ useGoodsReceipts: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/goods-receipts/hooks/useReceivablePOs', () => ({ useReceivablePOs: vi.fn() }))

import { useGoodsReceipts } from '@/features/goods-receipts/hooks/useGoodsReceipts'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useReceivablePOs } from '@/features/goods-receipts/hooks/useReceivablePOs'

function setup() {
  vi.mocked(useGoodsReceipts).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGoodsReceipts>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
  vi.mocked(useReceivablePOs).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useReceivablePOs
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
      <GRNListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { locRef }
}

describe('GRNListPage — real-form submit writes the URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('choosing a status then clicking ค้นหา (real RHF async submit) lands q + status + page=1 in the URL', async () => {
    setup()
    const { locRef } = renderPage()
    await userEvent.click(screen.getByLabelText('สถานะ'))
    await userEvent.click(await screen.findByRole('option', { name: 'รับครบถ้วน' }))
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    await waitFor(() => {
      const params = new URLSearchParams(locRef.current)
      expect(params.get('q')).toBe('1')
      expect(params.get('status')).toBe('complete')
      expect(params.get('page')).toBe('1')
    })
  })
})
