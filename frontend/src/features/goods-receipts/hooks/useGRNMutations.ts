import { useMutation, useQueryClient } from '@tanstack/react-query'
import { goodsReceiptsApi } from '../api'
import type { CreateGoodsReceiptPayload } from '../types'

export function useGRNMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateGoodsReceiptPayload) => goodsReceiptsApi.create(data),
    onSuccess: (created) => {
      // GRN list + detail (prefix covers both keys)
      void queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
      // PO detail + its grn-history (['purchase-order', id] prefix covers both)
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', created.poId] })
      // PO list + receivable picker — a PO that just completed must drop out of the create picker
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      // a completing GRN consumes budget (reserved -> used) → refresh every budget surface:
      // ['budgets'] list/preview, ['budget'] money-trail detail (distinct prefix), dashboard cards
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
      void queryClient.invalidateQueries({ queryKey: ['budget'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'budgets'] })
    },
  })

  return { createMutation }
}
