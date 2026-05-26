import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

vi.mock('@/features/auth/api', () => ({
  authApi: {
    login: vi.fn(),
    getMe: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders email and password fields', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('labels the announcements panel as a named complementary landmark', () => {
    renderLoginPage()
    expect(
      screen.getByRole('complementary', { name: 'ประกาศและข่าวสาร' }),
    ).toBeInTheDocument()
  })

  it('shows validation error when email is empty', async () => {
    const user = userEvent.setup()
    renderLoginPage()
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('calls authApi.login with form values on submit', async () => {
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.login).mockResolvedValueOnce({ access_token: 'test-token' })

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message when login fails', async () => {
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Unauthorized'))

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('submits with a short password since login enforces no length rule', async () => {
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.login).mockResolvedValueOnce({ access_token: 'test-token' })

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), '123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: '123',
      })
    })
  })

  it('shows "Password is required" when password is empty', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })
})
