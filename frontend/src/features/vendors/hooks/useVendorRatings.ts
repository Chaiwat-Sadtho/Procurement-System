import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { vendorsApi } from '../api'

export function useVendorRatings(vendorId: number, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['vendor', vendorId, 'ratings', params],
    queryFn: () => vendorsApi.getRatings(vendorId, params),
    enabled: vendorId > 0,
    // pages flip in place, so keep the previous rows on screen instead of flashing empty
    placeholderData: keepPreviousData,
  })
}
