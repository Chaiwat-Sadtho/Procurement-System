import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/shared/types'

const { mutateStatus, hookState } = vi.hoisted(() => ({
  mutateStatus: vi.fn(),
  hookState: { statusPending: false },
}))
vi.mock('@/features/users/hooks/useUserMutations', () => ({
  useUserMutations: () => ({
    updateRoleMutation: { mutate: vi.fn(), isPending: false },
    updateStatusMutation: { mutate: mutateStatus, isPending: hookState.statusPending },
  }),
}))
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))

import { UserStatusToggle } from '@/features/users/components/UserStatusToggle'

function makeUser(over: Partial<User>): User {
  return {
    id: 5,
    email: 'somchai@company.com',
    firstName: 'สมชาย',
    middleName: null,
    lastName: 'ใจดี',
    fullName: 'สมชาย ใจดี',
    role: 'employee',
    isActive: true,
    departmentId: 1,
    department: { id: 1, name: 'IT', createdAt: '' },
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

describe('UserStatusToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hookState.statusPending = false
  })

  it('reflects active state via aria-checked', () => {
    render(<UserStatusToggle user={makeUser({ isActive: true })} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('toggling an active user off opens a confirm dialog without mutating', async () => {
    const u = userEvent.setup()
    render(<UserStatusToggle user={makeUser({ isActive: true })} />)
    await u.click(screen.getByRole('switch'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mutateStatus).not.toHaveBeenCalled()
  })

  it('confirming deactivation mutates with isActive=false and toasts', async () => {
    mutateStatus.mockImplementation((_vars, { onSuccess }) => onSuccess())
    const u = userEvent.setup()
    render(<UserStatusToggle user={makeUser({ isActive: true })} />)
    await u.click(screen.getByRole('switch'))
    // ConfirmDialog renders confirmLabel as the button text; for deactivate it is the
    // destructive action label "ปิดการใช้งาน" (not a generic "ยืนยัน").
    await u.click(screen.getByRole('button', { name: 'ปิดการใช้งาน' }))
    expect(mutateStatus).toHaveBeenCalledWith(
      { id: 5, isActive: false },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
    expect(toastSuccess).toHaveBeenCalledWith('ปิดการใช้งานแล้ว')
  })

  it('a failed deactivation closes the dialog, toasts the reason, and leaves the switch on', async () => {
    const { AxiosError } = await import('axios')
    mutateStatus.mockImplementation((_vars, { onError }) =>
      onError(
        new AxiosError('x', 'ERR', undefined, undefined, {
          status: 400,
          data: { message: 'Cannot remove the last active procurement officer' },
          statusText: '',
          headers: {},
          config: {} as never,
        }),
      ),
    )
    const u = userEvent.setup()
    render(<UserStatusToggle user={makeUser({ isActive: true })} />)
    await u.click(screen.getByRole('switch'))
    await u.click(screen.getByRole('button', { name: 'ปิดการใช้งาน' }))
    // onError must close the dialog; otherwise it stays stuck and blocks retry (spec §10).
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toastError).toHaveBeenCalledWith('ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน')
    // switch is server-bound (checked=user.isActive); a failed mutate must not flip it.
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('toggling an inactive user on mutates directly without a dialog', async () => {
    mutateStatus.mockImplementation((_vars, { onSuccess }) => onSuccess())
    const u = userEvent.setup()
    render(<UserStatusToggle user={makeUser({ isActive: false })} />)
    await u.click(screen.getByRole('switch'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mutateStatus).toHaveBeenCalledWith(
      { id: 5, isActive: true },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
    expect(toastSuccess).toHaveBeenCalledWith('เปิดการใช้งานแล้ว')
  })

  it('disables the switch while a status update is pending (no double-submit, §2 D10)', () => {
    hookState.statusPending = true
    render(<UserStatusToggle user={makeUser({ isActive: true })} />)
    expect(screen.getByRole('switch')).toBeDisabled()
  })

  it('disabled renders a disabled switch and the reason hint, and does not mutate', async () => {
    const u = userEvent.setup()
    render(
      <UserStatusToggle
        user={makeUser({ isActive: true })}
        disabled
        disabledReason="ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน"
      />,
    )
    const sw = screen.getByRole('switch')
    expect(sw).toBeDisabled()
    await u.click(sw)
    expect(mutateStatus).not.toHaveBeenCalled()
    expect(screen.getByText('ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน')).toBeInTheDocument()
  })
})
