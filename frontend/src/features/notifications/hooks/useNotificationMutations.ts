import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api'

export function useNotificationMutations() {
  const queryClient = useQueryClient()
  // prefix invalidate covers ['notifications','list',*] and ['notifications','unread-count']
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
  })

  return { markReadMutation, markAllReadMutation }
}
