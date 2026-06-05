import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { purchaseOrdersApi } from '../api'

/**
 * Read the vendor rating for a PO (`GET /purchase-orders/:id/rating`, null if unrated).
 * Sub-key of the PO detail (`['purchase-order', id]`) so rating after a successful
 * mutation flips this section to read-only via prefix-cascade invalidation.
 * Caller gates `enabled` on PO being completed (only completed POs can be rated).
 */
export function useVendorRatingForPo(
  poId: number,
  { enabled = true }: QueryEnabledOptions = {},
) {
  return useQuery({
    queryKey: ['purchase-order', poId, 'rating'],
    queryFn: () => purchaseOrdersApi.getRating(poId),
    enabled: poId > 0 && enabled,
  })
}
