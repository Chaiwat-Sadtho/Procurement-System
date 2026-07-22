import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '../api'
import type { RateVendorPayload } from '../types'

/**
 * Rate the vendor of a completed PO. Success invalidates the PO detail and vendor keys, which cascade
 * to the rating section and the vendor's ratingAvg/history. Failure invalidates only the rating
 * sub-key: a 409 means another tab rated it first, so re-fetching flips the section to read-only
 * without refetching the whole PO on an ordinary validation error.
 */
export function useRateVendor(poId: number, vendorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RateVendorPayload) => purchaseOrdersApi.rate(poId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      void queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      // the vendor list shows a ratingAvg column, so refresh it too
      void queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchase-order', poId, 'rating'] })
    },
  })
}
