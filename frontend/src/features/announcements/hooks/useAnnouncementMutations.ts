import { useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi } from '../api'
import type { AnnouncementPayload } from '../types'

export function useAnnouncementMutations() {
  const queryClient = useQueryClient()
  // prefix invalidate: ['announcements'] covers both ['announcements','list'] (admin)
  // and ['announcements','public'] (login) via react-query fuzzy matching
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['announcements'] })

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementPayload) => announcementsApi.create(data),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AnnouncementPayload> }) =>
      announcementsApi.update(id, data),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => announcementsApi.remove(id),
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
