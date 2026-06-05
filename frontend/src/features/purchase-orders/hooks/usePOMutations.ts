import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '../api'
import type { CreatePORequest, UpdatePORequest } from '../types'

export function usePOMutations() {
  const queryClient = useQueryClient()

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
  }
  function invalidateOne(id: number) {
    void queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
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
