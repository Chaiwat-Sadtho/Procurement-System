import api from '@/shared/lib/axios'
import type { NotificationListResponse, NotificationQuery } from './types'

export const notificationsApi = {
  list: (query: NotificationQuery = {}) =>
    api.get<NotificationListResponse>('/notifications', { params: query }).then((r) => r.data),
  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),
  markRead: (id: number) =>
    api.patch<unknown>(`/notifications/${id}/read`).then(() => undefined),
  markAllRead: () => api.patch<unknown>('/notifications/read-all').then(() => undefined),
}
