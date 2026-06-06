import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SecurityPage } from './SecurityPage'

vi.mock('@/features/settings/api', () => ({
  settingsApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { settingsApi } from '@/features/settings/api'
import { toast } from 'sonner'

function renderSecurityPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityPage />
    </QueryClientProvider>,
  )
}

async function fillPasswords(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm: string,
) {
  await user.type(screen.getByLabelText(/current password/i), current)
  await user.type(screen.getByLabelText(/^new password/i), next)
  await user.type(screen.getByLabelText(/confirm new password/i), confirm)
}

describe('SecurityPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows error when new password is shorter than 8 chars', async () => {
    const user = userEvent.setup()
    renderSecurityPage()
    await fillPasswords(user, 'oldpass12', 'short', 'short')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
    expect(settingsApi.changePassword).not.toHaveBeenCalled()
  })

  it('shows error when confirm does not match', async () => {
    const user = userEvent.setup()
    renderSecurityPage()
    await fillPasswords(user, 'oldpass12', 'newpass123', 'different123')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
    expect(settingsApi.changePassword).not.toHaveBeenCalled()
  })

  it('shows error when new password equals current', async () => {
    const user = userEvent.setup()
    renderSecurityPage()
    await fillPasswords(user, 'samepass12', 'samepass12', 'samepass12')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(screen.getByText(/new password must be different/i)).toBeInTheDocument()
    })
    expect(settingsApi.changePassword).not.toHaveBeenCalled()
  })

  it('calls changePassword and resets form on success', async () => {
    vi.mocked(settingsApi.changePassword).mockResolvedValueOnce({
      message: 'ok',
    })
    const user = userEvent.setup()
    renderSecurityPage()
    await fillPasswords(user, 'oldpass12', 'newpass123', 'newpass123')
    await user.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(settingsApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpass12',
        newPassword: 'newpass123',
      })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
      expect(screen.getByLabelText(/current password/i)).toHaveValue('')
    })
  })

  it('shows error toast when current password is wrong (401)', async () => {
    vi.mocked(settingsApi.changePassword).mockRejectedValueOnce(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
        data: { message: 'Current password is incorrect' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as never,
      } as never),
    )
    const user = userEvent.setup()
    renderSecurityPage()
    await fillPasswords(user, 'wrongpass12', 'newpass123', 'newpass123')
    await user.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('รหัสผ่านปัจจุบันไม่ถูกต้อง')
    })
  })

  it('sets autocomplete tokens on password inputs for password managers (finding G)', () => {
    renderSecurityPage()
    expect(screen.getByLabelText(/current password/i)).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
    expect(screen.getByLabelText(/^new password/i)).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText(/confirm new password/i)).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
  })

  it('shows a generic error toast for non-401 failures (finding N)', async () => {
    vi.mocked(settingsApi.changePassword).mockRejectedValueOnce(
      new AxiosError('Server error', 'ERR_BAD_RESPONSE', undefined, undefined, {
        data: { message: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as never,
      } as never),
    )
    const user = userEvent.setup()
    renderSecurityPage()
    await fillPasswords(user, 'oldpass12', 'newpass123', 'newpass123')
    await user.click(screen.getByRole('button', { name: /change password/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('เปลี่ยนรหัสผ่านไม่สำเร็จ')
    })
  })

  it('keeps Change Password disabled until every field is valid (round 2 UX)', async () => {
    const user = userEvent.setup()
    renderSecurityPage()
    const button = screen.getByRole('button', { name: /change password/i })
    expect(button).toBeDisabled()

    await fillPasswords(user, 'oldpass12', 'newpass123', 'newpass123')

    await waitFor(() => expect(button).toBeEnabled())
  })
})
