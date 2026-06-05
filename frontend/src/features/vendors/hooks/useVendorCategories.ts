import { useQuery } from '@tanstack/react-query'
import { vendorCategoriesApi } from '../api'

export function useVendorCategories() {
  return useQuery({
    queryKey: ['vendor-categories'],
    queryFn: vendorCategoriesApi.list,
  })
}
