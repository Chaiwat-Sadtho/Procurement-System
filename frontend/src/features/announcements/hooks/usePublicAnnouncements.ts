import { useQuery } from '@tanstack/react-query'
import { announcementsApi } from '../api'

export function usePublicAnnouncements() {
  return useQuery({ queryKey: ['announcements', 'public'], queryFn: announcementsApi.listActive })
}
