import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import type { User } from '@/shared/types'

vi.mock('@/shared/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  middleName: null,
  lastName: 'User',
  fullName: 'Test User',
  role: 'employee',
  departmentId: 1,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function renderWithRouter(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Unauthorized'),
    } as ReturnType<typeof useCurrentUser>)

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /dashboard when role is not allowed', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)

    renderWithRouter(
      <ProtectedRoute allowedRoles={['procurement_officer']}>
        <div>Admin Only</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument()
  })

  it('renders children when user role is in allowedRoles', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)

    renderWithRouter(
      <ProtectedRoute allowedRoles={['employee', 'manager']}>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows spinner and no content while loading', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })
})
