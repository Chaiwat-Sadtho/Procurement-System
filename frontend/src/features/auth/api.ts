import type { User } from '@/shared/types'
import api from '@/shared/lib/axios'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  access_token: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then((res) => res.data),

  getMe: () => api.get<User>('/auth/me').then((res) => res.data),
}
