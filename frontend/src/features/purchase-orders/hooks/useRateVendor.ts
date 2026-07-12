import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '../api'
import type { RateVendorPayload } from '../types'

/**
 * Rate the vendor of a completed PO. On success invalidate the PO detail key
 * (`['purchase-order', poId]` — prefix-cascades to `[...,'rating']` so the
 * section flips to read-only) and the vendor key (`['vendor', vendorId]` —
 * cascades to detail ratingAvg + `[...,'ratings']` history).
 *
 * On error invalidate ONLY the rating sub-key `['purchase-order', poId, 'rating']`:
 * a 409 means another tab already rated this PO, so re-fetching the rating flips
 * the section to read-only instead of leaving the stale "rate" button.
 * Narrow sub-key (not the broad detail key) avoids refetching the whole PO on a
 * plain 400 validation error.
 */
export function useRateVendor(poId: number, vendorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RateVendorPayload) => purchaseOrdersApi.rate(poId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      void queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      // the vendors LIST shows a ratingAvg column; a new rating changes it, so refresh the
      // list too (the sibling useVendorMutations already invalidates ['vendors'])
      void queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', poId, 'rating'] })
    },
  })
}
