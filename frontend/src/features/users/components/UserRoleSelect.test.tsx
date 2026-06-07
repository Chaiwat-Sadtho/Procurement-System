import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/shared/types'

const { mutateRole, hookState } = vi.hoisted(() => ({
  mutateRole: vi.fn(),
  hookState: { rolePending: false },
}))
vi.mock('../hooks/useUserMutations', () => ({
  useUserMutations: () => ({
    updateRoleMutation: { mutate: mutateRole, isPending: hookState.rolePending },
    updateStatusMutation: { mutate: vi.fn(), isPending: false },
  }),
}))
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))

import { UserRoleSelect } from './UserRoleSelect'

const user: User = {
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
}

describe('UserRoleSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hookState.rolePending = false
  })

  it('shows the current role label and does not mutate on mount', () => {
    render(<UserRoleSelect user={user} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('พนักงาน')
    expect(mutateRole).not.toHaveBeenCalled()
  })

  it('selecting a different role opens a confirm dialog without mutating', async () => {
    const u = userEvent.setup()
    render(<UserRoleSelect user={user} />)
    await u.click(screen.getByRole('combobox'))
    await u.click(screen.getByRole('option', { name: 'ผู้จัดการ' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mutateRole).not.toHaveBeenCalled()
  })

  it('confirming mutates with the pending role and toasts success', async () => {
    mutateRole.mockImplementation((_vars, { onSuccess }) => onSuccess())
    const u = userEvent.setup()
    render(<UserRoleSelect user={user} />)
    await u.click(screen.getByRole('combobox'))
    await u.click(screen.getByRole('option', { name: 'ผู้จัดการ' }))
    await u.click(screen.getByRole('button', { name: 'ยืนยัน' }))
    expect(mutateRole).toHaveBeenCalledWith(
      { id: 5, role: 'manager' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
    expect(toastSuccess).toHaveBeenCalledWith('อัปเดตบทบาทแล้ว')
  })

  it('cancelling snaps the trigger back to the original role and does not mutate', async () => {
    const u = userEvent.setup()
    render(<UserRoleSelect user={user} />)
    await u.click(screen.getByRole('combobox'))
    await u.click(screen.getByRole('option', { name: 'ผู้จัดการ' }))
    await u.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Snap-back works because `value` is strictly bound to user.role (never pendingRole):
    // cancel routes through onOpenChange(false) -> clears pendingRole WITHOUT touching value,
    // so Radix re-renders the trigger from the unchanged prop. This is the §7/§10 trap —
    // an uncontrolled/defaultValue impl would leave the trigger showing 'ผู้จัดการ'.
    expect(screen.getByRole('combobox')).toHaveTextContent('พนักงาน')
    expect(mutateRole).not.toHaveBeenCalled()
  })

  it('clears pending state on error so the dialog closes (allows retry)', async () => {
    mutateRole.mockImplementation((_vars, { onError }) => onError(new Error('boom')))
    const u = userEvent.setup()
    render(<UserRoleSelect user={user} />)
    await u.click(screen.getByRole('combobox'))
    await u.click(screen.getByRole('option', { name: 'ผู้จัดการ' }))
    await u.click(screen.getByRole('button', { name: 'ยืนยัน' }))
    // onError must clear pendingRole; otherwise the dialog stays open and blocks a fresh attempt.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('maps a last-active-PO backend error to a Thai toast', async () => {
    const { AxiosError } = await import('axios')
    mutateRole.mockImplementation((_vars, { onError }) =>
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
    render(<UserRoleSelect user={user} />)
    await u.click(screen.getByRole('combobox'))
    await u.click(screen.getByRole('option', { name: 'ผู้จัดการ' }))
    await u.click(screen.getByRole('button', { name: 'ยืนยัน' }))
    expect(toastError).toHaveBeenCalledWith('ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน')
  })

  it('disables the trigger while a role update is pending (no double-submit, §2 D10)', () => {
    hookState.rolePending = true
    render(<UserRoleSelect user={user} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('disabled renders the select disabled and shows the reason hint', () => {
    render(<UserRoleSelect user={user} disabled disabledReason="แก้ไขบัญชีตัวเองไม่ได้" />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByText('แก้ไขบัญชีตัวเองไม่ได้')).toBeInTheDocument()
  })
})
