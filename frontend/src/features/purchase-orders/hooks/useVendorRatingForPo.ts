import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { purchaseOrdersApi } from '../api'

/**
 * The vendor rating for a PO, null while unrated. Keyed as a sub-key of the PO detail so invalidating
 * the detail also flips this section to read-only after a successful rating.
 */
export function useVendorRatingForPo(poId: number, { enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    queryKey: ['purchase-order', poId, 'rating'],
    queryFn: () => purchaseOrdersApi.getRating(poId),
    enabled: poId > 0 && enabled,
  })
}
