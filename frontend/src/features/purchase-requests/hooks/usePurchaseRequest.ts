import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseRequestsApi } from '../api'

export function usePurchaseRequest(id: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['purchase-request', id],
    queryFn: () => purchaseRequestsApi.get(id),
    enabled: id > 0,
  })

  // submit/reject don't move budget; ['purchase-requests'] prefix already covers the
  // eligible-for-PO picker and ['dashboard'] covers the dashboard budget cards.
  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-request', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  // approve reserves the dept budget → also refresh the budget list/preview (['budgets']) and
  // the detail money-trail page (['budget'] — distinct prefix). Dashboard budgets + eligible
  // picker are already covered by invalidate()'s broad prefixes above (M3).
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
