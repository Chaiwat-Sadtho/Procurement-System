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
      // PO list (status may flip acknowledged -> partially_received/completed)
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })

  return { createMutation }
}
