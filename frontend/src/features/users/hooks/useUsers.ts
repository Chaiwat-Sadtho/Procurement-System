import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api'

interface UseUsersOptions {
  enabled?: boolean
}

export function useUsers({ enabled = true }: UseUsersOptions = {}) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    staleTime: 5 * 60_000,
    enabled,
  })
}
