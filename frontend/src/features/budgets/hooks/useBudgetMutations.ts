import { useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi } from '../api'
import type { CreateBudgetRequest, UpdateBudgetRequest } from '../types'

export function useBudgetMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateBudgetRequest) => budgetsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBudgetRequest }) =>
      budgetsApi.update(id, data),
    onSuccess: (_res, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['budget', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })

  return { createMutation, updateMutation }
}
