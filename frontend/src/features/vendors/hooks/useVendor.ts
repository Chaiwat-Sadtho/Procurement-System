import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vendorsApi } from '../api'

export function useVendor(id: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorsApi.get(id),
    enabled: id > 0,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['vendor', id] })
    void queryClient.invalidateQueries({ queryKey: ['vendors'] })
  }

  const blacklistMutation = useMutation({
    mutationFn: (reason: string) => vendorsApi.blacklist(id, reason),
    onSuccess: invalidate,
  })

  const unblacklistMutation = useMutation({
    mutationFn: () => vendorsApi.unblacklist(id),
    onSuccess: invalidate,
  })

  return { ...query, blacklistMutation, unblacklistMutation }
}
