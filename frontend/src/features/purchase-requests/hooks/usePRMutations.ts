import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseRequestsApi } from '../api'
import type { CreatePRRequest, UpdatePRRequest } from '../types'

export function usePRMutations() {
  const queryClient = useQueryClient()

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  function invalidateOne(id: number) {
    void queryClient.invalidateQueries({ queryKey: ['purchase-request', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: CreatePRRequest) => purchaseRequestsApi.create(data),
    onSuccess: invalidateList,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePRRequest }) =>
      purchaseRequestsApi.update(id, data),
    onSuccess: (_res, vars) => invalidateOne(vars.id),
  })

  const submitMutation = useMutation({
    mutationFn: (id: number) => purchaseRequestsApi.submit(id),
    onSuccess: (_res, id) => invalidateOne(id),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseRequestsApi.remove(id),
    onSuccess: (_res, id) => {
      // record no longer exists -> drop its detail cache entry so a Back-nav
      // within staleTime can't render the deleted PR from a stale cache
      queryClient.removeQueries({ queryKey: ['purchase-request', id] })
      invalidateList()
    },
  })

  return { createMutation, updateMutation, submitMutation, deleteMutation }
}
