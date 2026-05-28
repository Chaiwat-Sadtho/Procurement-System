import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseRequestsApi } from '../api'

export function usePurchaseRequest(id: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['purchase-request', id],
    queryFn: () => purchaseRequestsApi.get(id),
    enabled: id > 0,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-request', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
  }

  const submitMutation = useMutation({
    mutationFn: () => purchaseRequestsApi.submit(id),
    onSuccess: invalidate,
  })

  const approveMutation = useMutation({
    mutationFn: () => purchaseRequestsApi.approve(id),
    onSuccess: invalidate,
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => purchaseRequestsApi.reject(id, reason),
    onSuccess: invalidate,
  })

  return { ...query, submitMutation, approveMutation, rejectMutation }
}
