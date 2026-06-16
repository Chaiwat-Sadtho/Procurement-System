import { describe, it, expect } from 'vitest'
import { filterUsers, DEFAULT_USER_FILTERS } from '@/features/users/lib/userFilters'
import type { User } from '@/shared/types'

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

const users: User[] = [
  makeUser({
    id: 1,
    fullName: 'สมชาย ใจดี',
    email: 'somchai@company.com',
    role: 'employee',
    isActive: true,
  }),
  makeUser({
    id: 2,
    fullName: 'สมหญิง รักงาน',
    email: 'somying@company.com',
    role: 'manager',
    isActive: false,
  }),
  makeUser({
    id: 3,
    fullName: 'Procure Officer',
    email: 'po@company.com',
    role: 'procurement_officer',
    isActive: true,
  }),
]

describe('filterUsers', () => {
  it('DEFAULT_USER_FILTERS returns everyone', () => {
    expect(filterUsers(users, DEFAULT_USER_FILTERS)).toHaveLength(3)
  })

  it('search matches fullName substring (case-insensitive)', () => {
    const r = filterUsers(users, { ...DEFAULT_USER_FILTERS, search: 'สมชาย' })
    expect(r.map((u) => u.id)).toEqual([1])
  })

  it('search matches email substring (case-insensitive)', () => {
    const r = filterUsers(users, { ...DEFAULT_USER_FILTERS, search: 'PO@COMPANY' })
    expect(r.map((u) => u.id)).toEqual([3])
  })

  it('role filter is exact', () => {
    const r = filterUsers(users, { ...DEFAULT_USER_FILTERS, role: 'manager' })
    expect(r.map((u) => u.id)).toEqual([2])
  })

  it('status active keeps only active', () => {
    const r = filterUsers(users, { ...DEFAULT_USER_FILTERS, status: 'active' })
    expect(r.map((u) => u.id)).toEqual([1, 3])
  })

  it('status inactive keeps only inactive', () => {
    const r = filterUsers(users, { ...DEFAULT_USER_FILTERS, status: 'inactive' })
    expect(r.map((u) => u.id)).toEqual([2])
  })

  it('combines search + role + status (AND)', () => {
    const r = filterUsers(users, {
      search: 'company',
      role: 'procurement_officer',
      status: 'active',
    })
    expect(r.map((u) => u.id)).toEqual([3])
  })

  it('whitespace-only search is ignored', () => {
    expect(filterUsers(users, { ...DEFAULT_USER_FILTERS, search: '   ' })).toHaveLength(3)
  })
})
