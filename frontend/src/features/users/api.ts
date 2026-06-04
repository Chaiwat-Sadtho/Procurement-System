import api from '@/shared/lib/axios'
import type { Role, User } from '@/shared/types'

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),

  updateRole: (id: number, role: Role) =>
    api.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),

  updateStatus: (id: number, isActive: boolean) =>
    api.patch<User>(`/users/${id}/status`, { isActive }).then((r) => r.data),
}
