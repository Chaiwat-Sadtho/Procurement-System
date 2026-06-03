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

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
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
    onSuccess: invalidate,
  })

  return { ...query, grnsQuery, sendMutation, acknowledgeMutation, cancelMutation }
}
