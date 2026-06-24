import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../api'
import type { NotificationQuery } from '../types'

export function useNotifications(query: NotificationQuery = {}) {
  return useQuery({
    queryKey: ['notifications', 'list', query],
    queryFn: () => notificationsApi.list(query),
  })
}
