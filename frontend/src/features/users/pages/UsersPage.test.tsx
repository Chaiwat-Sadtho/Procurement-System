import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { User } from '@/shared/types'

const { useUsersMock, useCurrentUserMock } = vi.hoisted(() => ({
  useUsersMock: vi.fn(),
  useCurrentUserMock: vi.fn(),
}))
vi.mock('../hooks/useUsers', () => ({ useUsers: useUsersMock }))
vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: useCurrentUserMock }))

// isolate the page's guard computation from the inline controls
vi.mock('../components/UserRoleSelect', () => ({
  UserRoleSelect: ({ user, disabled, disabledReason }: { user: User; disabled?: boolean; disabledReason?: string }) => (
    <div data-testid={`role-${user.id}`} data-disabled={String(!!disabled)} data-reason={disabledReason ?? ''}>
      {user.role}
    </div>
  ),
}))
vi.mock('../components/UserStatusToggle', () => ({
  UserStatusToggle: ({ user, disabled, disabledReason }: { user: User; disabled?: boolean; disabledReason?: string }) => (
    <div data-testid={`status-${user.id}`} data-disabled={String(!!disabled)} data-reason={disabledReason ?? ''}>
      {String(user.isActive)}
    </div>
  ),
}))

import { UsersPage } from './UsersPage'

function makeUser(over: Partial<User>): User {
  return {
    id: 1,
    email: 'a@company.com',
    firstName: 'A',
    middleName: null,
    lastName: 'B',
    fullName: 'A B',
    role: 'employee',
    isActive: true,
    departmentId: 1,
    department: { id: 1, name: 'IT', createdAt: '' },
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

const ACTOR = makeUser({ id: 99, role: 'procurement_officer', fullName: 'Actor PO', email: 'actor@company.com' })

beforeEach(() => {
  vi.clearAllMocks()
  useCurrentUserMock.mockReturnValue({ data: ACTOR })
})

function mockUsers(over: Partial<ReturnType<typeof useUsersMock>> = {}) {
  useUsersMock.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn(), ...over })
}

describe('UsersPage', () => {
  it('renders the loading state', () => {
    mockUsers({ isLoading: true })
    render(<UsersPage />)
    expect(screen.getByTestId('users-loading')).toBeInTheDocument()
  })

  it('renders the error state with a retry button', () => {
    mockUsers({ isError: true })
    render(<UsersPage />)
    expect(screen.getByRole('button', { name: 'ลองใหม่' })).toBeInTheDocument()
  })

  it('renders an empty row when there are no users', () => {
    mockUsers({ data: [] })
    render(<UsersPage />)
    expect(screen.getByText('ไม่พบข้อมูลตามเงื่อนไข')).toBeInTheDocument()
  })

  it('renders rows with fullName, email and department, and a total summary', () => {
    mockUsers({
      data: [
        makeUser({ id: 1, fullName: 'สมชาย ใจดี', email: 'somchai@company.com', department: { id: 2, name: 'จัดซื้อ', createdAt: '' } }),
        makeUser({ id: 2, fullName: 'สมหญิง รักงาน', email: 'somying@company.com', department: null, departmentId: null }),
      ],
    })
    render(<UsersPage />)
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument()
    expect(screen.getByText('somchai@company.com')).toBeInTheDocument()
    expect(screen.getByText('จัดซื้อ')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // null department
    expect(screen.getByText('ทั้งหมด 2 คน')).toBeInTheDocument()
  })

  it('disables both controls on the actor own row with a self hint', () => {
    mockUsers({ data: [ACTOR, makeUser({ id: 1 })] })
    render(<UsersPage />)
    expect(screen.getByTestId('role-99')).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByTestId('status-99')).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByTestId('role-99')).toHaveAttribute('data-reason', 'แก้ไขบัญชีตัวเองไม่ได้')
    // a different employee row stays enabled
    expect(screen.getByTestId('role-1')).toHaveAttribute('data-disabled', 'false')
  })

  it('disables the only active procurement officer (last-active-PO guard)', () => {
    // currentUser is a manager-less PO not in the list; the single active PO below is the last one
    useCurrentUserMock.mockReturnValue({ data: makeUser({ id: 1000, role: 'procurement_officer' }) })
    mockUsers({
      data: [
        makeUser({ id: 1, role: 'procurement_officer', isActive: true }),
        makeUser({ id: 2, role: 'procurement_officer', isActive: false }),
        makeUser({ id: 3, role: 'employee', isActive: true }),
      ],
    })
    render(<UsersPage />)
    expect(screen.getByTestId('role-1')).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByTestId('status-1')).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByTestId('role-1')).toHaveAttribute(
      'data-reason',
      'ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน',
    )
    // the employee row is unaffected
    expect(screen.getByTestId('role-3')).toHaveAttribute('data-disabled', 'false')
  })
})
