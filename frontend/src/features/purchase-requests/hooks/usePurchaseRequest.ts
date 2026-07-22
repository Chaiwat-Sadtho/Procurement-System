import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseRequestsApi } from '../api'

export function usePurchaseRequest(id: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['purchase-request', id],
    queryFn: () => purchaseRequestsApi.get(id),
    enabled: id > 0,
  })

  // submit/reject do not move budget, and these prefixes already cover the picker and dashboard
  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-request', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  // Approving reserves budget, so the list and the money-trail page (a distinct prefix) need refreshing
  function invalidateApprove() {
    invalidate()
    void queryClient.invalidateQueries({ queryKey: ['budgets'] })
    void queryClient.invalidateQueries({ queryKey: ['budget'] })
  }

  const submitMutation = useMutation({
    mutationFn: () => purchaseRequestsApi.submit(id),
    onSuccess: invalidate,
  })

  const approveMutation = useMutation({
    mutationFn: () => purchaseRequestsApi.approve(id),
    onSuccess: invalidateApprove,
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => purchaseRequestsApi.reject(id, reason),
    onSuccess: invalidate,
  })

  return { ...query, submitMutation, approveMutation, rejectMutation }
}
