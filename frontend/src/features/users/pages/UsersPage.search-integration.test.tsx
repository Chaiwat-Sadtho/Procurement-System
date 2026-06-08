import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { UsersPage } from './UsersPage'

// Mock data hooks only — UserListFilterForm is the REAL component, so the submit
// runs through RHF's async handleSubmit microtask and the hook's setState→effect write.
// This guards that a real-form submit actually lands q + search in the URL (wiring +
// the effect firing). Non-vacuity: stub the page's commit to a no-op → this test fails.
//
// NOTE (#47, TESTING.md): jsdom+RTL cannot reproduce the real-browser navigate no-op.
// Whether commit writes the URL directly in the RHF microtask or via the effect, the
// navigate still commits here (RTL flushes the microtask inside React's batching). So this
// test does NOT distinguish the direct-write regression from the effect fix; that
// distinction is browser-only (verify-live, tools/eyeball).
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))

import { useUsers } from '../hooks/useUsers'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

function setup() {
  vi.mocked(useUsers).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useUsers>)
  vi.mocked(useCurrentUser).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
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
      <UsersPage />
      <LocationProbe />
    </MemoryRouter>,
  )
  return { locRef }
}

describe('UsersPage — real-form submit writes the URL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('typing a name then clicking ค้นหา (real RHF async submit) lands q + search in the URL', async () => {
    setup()
    const { locRef } = renderPage()
    await userEvent.type(screen.getByLabelText('ค้นหา'), 'somchai')
    await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
    await waitFor(() => {
      const params = new URLSearchParams(locRef.current)
      expect(params.get('q')).toBe('1')
      expect(params.get('search')).toBe('somchai')
    })
  })
})
