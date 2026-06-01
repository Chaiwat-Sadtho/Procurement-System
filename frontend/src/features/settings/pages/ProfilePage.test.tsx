import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfilePage } from './ProfilePage'
import type { User } from '@/shared/types'

vi.mock('@/features/settings/api', () => ({
  settingsApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('@/shared/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { settingsApi } from '@/features/settings/api'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

const mockUser: User = {
  id: 1,
  email: 'somchai@company.com',
  firstName: 'Somchai',
  middleName: null,
  lastName: 'Jaidee',
  fullName: 'Somchai Jaidee',
  role: 'employee',
  departmentId: 1,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)
  })

  it('prefills first/middle/last name from current user', () => {
    renderProfilePage()
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Somchai')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Jaidee')
  })

  it('shows email and role as read-only text', () => {
    renderProfilePage()
    expect(screen.getByText('somchai@company.com')).toBeInTheDocument()
    expect(screen.getByText(/employee/i)).toBeInTheDocument()
  })

  it('shows validation error when first name is cleared', async () => {
    const user = userEvent.setup()
    renderProfilePage()
    await user.clear(screen.getByLabelText(/first name/i))
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })
  })

  it('calls updateProfile with form values on submit', async () => {
    vi.mocked(settingsApi.updateProfile).mockResolvedValueOnce({
      ...mockUser,
      firstName: 'Somsak',
      fullName: 'Somsak Jaidee',
    })
    const user = userEvent.setup()
    renderProfilePage()

    await user.clear(screen.getByLabelText(/first name/i))
    await user.type(screen.getByLabelText(/first name/i), 'Somsak')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(settingsApi.updateProfile).toHaveBeenCalledWith({
        firstName: 'Somsak',
        middleName: null,
        lastName: 'Jaidee',
      })
    })
  })
})
