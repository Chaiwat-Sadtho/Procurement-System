import { useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorsApi } from '../api'
import type { VendorPayload } from '../types'

export function useVendorMutations() {
  const queryClient = useQueryClient()

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: ['vendors'] })
  }
  function invalidateOne(id: number) {
    void queryClient.invalidateQueries({ queryKey: ['vendor', id] })
    void queryClient.invalidateQueries({ queryKey: ['vendors'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: VendorPayload) => vendorsApi.create(data),
    onSuccess: invalidateList,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VendorPayload }) =>
      vendorsApi.update(id, data),
    onSuccess: (_res, vars) => invalidateOne(vars.id),
  })

  return { createMutation, updateMutation }
}
