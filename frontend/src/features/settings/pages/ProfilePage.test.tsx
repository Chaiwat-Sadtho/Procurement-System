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
import { toast } from 'sonner'

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
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
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
    expect(screen.getByLabelText('ชื่อจริง')).toHaveValue('Somchai')
    expect(screen.getByLabelText('นามสกุล')).toHaveValue('Jaidee')
  })

  it('shows email and role as read-only text', () => {
    renderProfilePage()
    expect(screen.getByText('somchai@company.com')).toBeInTheDocument()
    expect(screen.getByText(/พนักงาน/)).toBeInTheDocument()
  })

  it('shows validation error when first name is cleared', async () => {
    const user = userEvent.setup()
    renderProfilePage()
    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() => {
      expect(screen.getByText(/กรุณากรอกชื่อจริง/)).toBeInTheDocument()
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

    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.type(screen.getByLabelText('ชื่อจริง'), 'Somsak')
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(settingsApi.updateProfile).toHaveBeenCalledWith({
        firstName: 'Somsak',
        middleName: null,
        lastName: 'Jaidee',
      })
    })
  })

  it('disables Save while the form has no unsaved changes (finding D)', () => {
    renderProfilePage()
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
  })

  it('keeps unsaved edits when the current user is refetched (finding B)', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>,
    )

    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.type(screen.getByLabelText('ชื่อจริง'), 'EditedName')

    // refetchOnWindowFocus returns a fresh user object (new reference) —
    // must NOT clobber the in-progress edit
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...mockUser },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>,
    )

    expect(screen.getByLabelText('ชื่อจริง')).toHaveValue('EditedName')
  })

  it('trims whitespace from names before submitting (finding C)', async () => {
    vi.mocked(settingsApi.updateProfile).mockResolvedValueOnce(mockUser)
    const user = userEvent.setup()
    renderProfilePage()

    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.type(screen.getByLabelText('ชื่อจริง'), '  Somsak  ')
    await user.type(screen.getByLabelText('ชื่อกลาง'), '  Kiet  ')
    await user.clear(screen.getByLabelText('นามสกุล'))
    await user.type(screen.getByLabelText('นามสกุล'), '  Jaidee  ')
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(settingsApi.updateProfile).toHaveBeenCalledWith({
        firstName: 'Somsak',
        middleName: 'Kiet',
        lastName: 'Jaidee',
      })
    })
  })

  it('treats a null first name as empty so required validation shows (finding E)', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...mockUser, firstName: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCurrentUser>)
    const user = userEvent.setup()
    renderProfilePage()

    // make the form dirty via middle name so Save is enabled, leaving firstName empty
    await user.type(screen.getByLabelText('ชื่อกลาง'), 'X')
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(screen.getByText(/กรุณากรอกชื่อจริง/)).toBeInTheDocument()
    })
  })

  it('pushes the updated user into the currentUser cache (finding J)', async () => {
    const updated: User = {
      ...mockUser,
      firstName: 'Somsak',
      fullName: 'Somsak Jaidee',
    }
    vi.mocked(settingsApi.updateProfile).mockResolvedValueOnce(updated)
    const user = userEvent.setup()
    const { queryClient } = renderProfilePage()

    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.type(screen.getByLabelText('ชื่อจริง'), 'Somsak')
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(queryClient.getQueryData(['currentUser'])).toEqual(updated)
    })
  })

  it('shows validation error when last name is cleared (finding K)', async () => {
    const user = userEvent.setup()
    renderProfilePage()
    await user.clear(screen.getByLabelText('นามสกุล'))
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() => {
      expect(screen.getByText(/กรุณากรอกนามสกุล/)).toBeInTheDocument()
    })
  })

  it('renders the department name when the user has a department (finding L)', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        ...mockUser,
        department: { id: 1, name: 'Finance', createdAt: '2025-01-01T00:00:00Z' },
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCurrentUser>)
    renderProfilePage()
    expect(screen.getByText('Finance')).toBeInTheDocument()
  })

  it('shows an error toast when the profile update fails (finding M)', async () => {
    vi.mocked(settingsApi.updateProfile).mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    renderProfilePage()

    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.type(screen.getByLabelText('ชื่อจริง'), 'Somsak')
    await user.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('บันทึกโปรไฟล์ไม่สำเร็จ')
    })
  })

  it('disables Save after a successful save to block double submit (round 2 UX)', async () => {
    vi.mocked(settingsApi.updateProfile).mockResolvedValueOnce({
      ...mockUser,
      firstName: 'Somsak',
      fullName: 'Somsak Jaidee',
    })
    const user = userEvent.setup()
    renderProfilePage()

    await user.clear(screen.getByLabelText('ชื่อจริง'))
    await user.type(screen.getByLabelText('ชื่อจริง'), 'Somsak')
    const saveButton = screen.getByRole('button', { name: 'บันทึก' })
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    await waitFor(() => expect(saveButton).toBeDisabled())
  })
})
