import { useMutation, useQueryClient } from '@tanstack/react-query'
import { goodsReceiptsApi } from '../api'
import type { CreateGoodsReceiptPayload } from '../types'

export function useGRNMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateGoodsReceiptPayload) => goodsReceiptsApi.create(data),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', created.poId] })
      // a PO that just completed must drop out of the create picker
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      // a completing GRN turns reserved budget into used, which shows on every budget surface
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
      void queryClient.invalidateQueries({ queryKey: ['budget'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'budgets'] })
    },
  })

  return { createMutation }
}
