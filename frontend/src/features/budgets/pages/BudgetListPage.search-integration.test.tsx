import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { User } from '@/shared/types'
import { BudgetListPage } from './BudgetListPage'

// Mock data hooks only — BudgetListFilterForm is the REAL component, so a submit runs the
// real form's handler + the hook's setState→effect write. This guards that a real-form submit
// actually lands q + fiscalYear in the URL (wiring + the effect firing). Non-vacuity: stub the
// page's commit to a no-op → this test fails. Budgets is not paginated → no page param.
//
// NOTE (#47, TESTING.md): the real-browser navigate no-op is browser-only; jsdom+RTL flushes
// the write either way. The direct-write vs effect distinction is verified live (tools/eyeball).
vi.mock('../hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useDepartments', () => ({ useDepartments: vi.fn() }))

import { useBudgets } from '../hooks/useBudgets'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'

function setup() {
  vi.mocked(useBudgets).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBudgets>)
  // procurement officer → department not locked (free to edit)
  vi.mocked(useCurrentUser).mockReturnValue({
    data: { id: 9, role: 'procurement_officer', departmentId: 1 } as User,
  } as ReturnType<typeof useCurrentUser>)
  vi.mocked(useDepartments).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useDepartments
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
      <BudgetListPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { locRef }
}

describe('BudgetListPage — real-form submit writes the URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('typing a fiscal year then clicking ค้นหา (real form submit) lands q + fiscalYear, no page param', async () => {
    setup()
    const { locRef } = renderPage()
    const yearInput = screen.getByLabelText('ปีงบประมาณ')
    await userEvent.clear(yearInput)
    await userEvent.type(yearInput, '2025')
    await userEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    await waitFor(() => {
      const params = new URLSearchParams(locRef.current)
      expect(params.get('q')).toBe('1')
      expect(params.get('fiscalYear')).toBe('2025')
      expect(params.has('page')).toBe(false)
    })
  })
})
