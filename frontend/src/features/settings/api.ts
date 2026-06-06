import type { User } from '@/shared/types'
import api from '@/shared/lib/axios'

export interface UpdateProfileRequest {
  firstName?: string
  middleName?: string | null
  lastName?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export const settingsApi = {
  updateProfile: (data: UpdateProfileRequest) =>
    api.patch<User>('/auth/me', data).then((res) => res.data),

  changePassword: (data: ChangePasswordRequest) =>
    api.patch<{ message: string }>('/auth/me/password', data).then((res) => res.data),
}
