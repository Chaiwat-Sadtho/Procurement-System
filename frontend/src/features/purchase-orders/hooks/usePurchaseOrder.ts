import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '../api'

export function usePurchaseOrder(id: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: id > 0,
  })

  const grnsQuery = useQuery({
    queryKey: ['purchase-order', id, 'grns'],
    queryFn: () => purchaseOrdersApi.getGoodsReceipts(id),
    enabled: id > 0,
  })

  // send/acknowledge only flip status — no budget or eligibility change
  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
  }

  // Cancelling releases budget and puts the PR back in the picker, so both need refreshing too
  function invalidateCancel() {
    invalidate()
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests', { eligibleForPo: true }] })
    void queryClient.invalidateQueries({ queryKey: ['budgets'] })
    void queryClient.invalidateQueries({ queryKey: ['budget'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'budgets'] })
  }

  const sendMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.send(id),
    onSuccess: invalidate,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.acknowledge(id),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.cancel(id),
    onSuccess: invalidateCancel,
  })

  return { ...query, grnsQuery, sendMutation, acknowledgeMutation, cancelMutation }
}
