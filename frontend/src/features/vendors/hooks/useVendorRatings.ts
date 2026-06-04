import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { vendorsApi } from '../api'

export function useVendorRatings(vendorId: number, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['vendor', vendorId, 'ratings', params],
    queryFn: () => vendorsApi.getRatings(vendorId, params),
    enabled: vendorId > 0,
    // pagination is local-state (flips pages in place, no route change), so keep
    // the previous page's rows on screen during the fetch instead of flashing empty
    placeholderData: keepPreviousData,
  })
}
