import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '../api'
import type { CreatePORequest, UpdatePORequest } from '../types'

export function usePOMutations() {
  const queryClient = useQueryClient()

  // Budget surface a PO write moves: create/update re-adjust the dept's reserved amount
  // (delta gate). ['budgets'] = budget list + PO-form preview; ['budget'] = the detail
  // money-trail page (summary/transactions — a DISTINCT prefix, NOT covered by ['budgets']);
  // ['dashboard','budgets'] = dashboard reserved/used cards.
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
    // editing a draft PO's items re-adjusts reserved (eligibility unchanged → no picker key)
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
