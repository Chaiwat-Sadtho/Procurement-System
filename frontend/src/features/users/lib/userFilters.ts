import type { User } from '@/shared/types'

export type StatusFilter = 'all' | 'active' | 'inactive'

export interface UserFilterValues {
  /** substring matched against fullName + email */
  search: string
  /** 'all' | Role */
  role: string
  status: StatusFilter
}

export const DEFAULT_USER_FILTERS: UserFilterValues = {
  search: '',
  role: 'all',
  status: 'all',
}

/**
 * Client-side filter. `GET /users` returns the full array in memory, so the
 * list is cheap to filter on every keystroke (spec §2 D2 / §7).
 */
export function filterUsers(users: User[], filters: UserFilterValues): User[] {
  const search = filters.search.trim().toLowerCase()
  return users.filter((u) => {
    if (search) {
      const haystack = `${u.fullName} ${u.email}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    if (filters.role !== 'all' && u.role !== filters.role) return false
    if (filters.status === 'active' && !u.isActive) return false
    if (filters.status === 'inactive' && u.isActive) return false
    return true
  })
}
