import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/features/auth/api'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
