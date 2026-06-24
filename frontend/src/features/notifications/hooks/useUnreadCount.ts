import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../api'

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
  })
}
