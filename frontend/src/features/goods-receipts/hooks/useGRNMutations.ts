import { useMutation, useQueryClient } from '@tanstack/react-query'
import { goodsReceiptsApi } from '../api'
import type { CreateGoodsReceiptPayload } from '../types'

export function useGRNMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateGoodsReceiptPayload) => goodsReceiptsApi.create(data),
    onSuccess: (created) => {
      // GRN list + detail (prefix covers ['goods-receipts','list',params] and ...'detail',id)
      void queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
      // PO detail + its grn-history are keyed ['purchase-order', id] and
      // ['purchase-order', id, 'grns'] — prefix-invalidate covers both (usePurchaseOrder.ts:8,14)
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', created.poId] })
      // PO list AND the receivable picker (['purchase-orders','receivable']): the prefix
      // refreshes both, so a PO that just completed (status flip
      // acknowledged -> partially_received/completed) drops out of the GRN create picker.
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      // Budget: a completing GRN consumes the PO amount (reserved -> used, spec §4A.6),
      // so refresh the PO-form preview (['budgets',{dept,fy}], useBudgetForPR.ts:33) and the
      // dashboard summary (['dashboard','budgets',...], useBudgets.ts:6). Prefix forms cover
      // every dept/fiscal-year variant.
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'budgets'] })
    },
  })

  return { createMutation }
}
