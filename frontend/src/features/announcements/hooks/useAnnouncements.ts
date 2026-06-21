import { useQuery } from '@tanstack/react-query'
import { announcementsApi } from '../api'

export function useAnnouncements() {
  return useQuery({ queryKey: ['announcements', 'list'], queryFn: announcementsApi.list })
}
