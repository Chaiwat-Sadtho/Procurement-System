import api from '@/shared/lib/axios'
import type { User } from '@/shared/types'

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
}
