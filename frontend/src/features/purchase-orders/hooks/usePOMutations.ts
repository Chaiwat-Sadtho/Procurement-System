import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '../api'
import type { CreatePORequest, UpdatePORequest } from '../types'

export function usePOMutations() {
  const queryClient = useQueryClient()

  // A PO write re-adjusts the department's reserved amount, which shows up in three places.
  // ['budget'] is a distinct prefix from ['budgets'] — the money-trail page, not the list.
  function invalidateBudget() {
    void queryClient.invalidateQueries({ queryKey: ['budgets'] })
    void queryClient.invalidateQueries({ queryKey: ['budget'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'budgets'] })
  }

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    // a new PO consumes its PR → that PR must drop out of the eligible-for-PO picker
    void queryClient.invalidateQueries({ queryKey: ['purchase-requests', { eligibleForPo: true }] })
    invalidateBudget()
  }
  function invalidateOne(id: number) {
    void queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    // editing items re-adjusts reserved, but PR eligibility is unchanged → no picker key here
    invalidateBudget()
  }

  const createMutation = useMutation({
    mutationFn: (data: CreatePORequest) => purchaseOrdersApi.create(data),
    onSuccess: invalidateList,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePORequest }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: (_res, vars) => invalidateOne(vars.id),
  })

  return { createMutation, updateMutation }
}
