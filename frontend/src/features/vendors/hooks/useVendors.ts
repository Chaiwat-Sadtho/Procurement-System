import { useQuery } from '@tanstack/react-query'
import { vendorsApi } from '../api'

interface UseVendorsParams {
  page?: number
  limit?: number
  search?: string
  isBlacklisted?: boolean
  categoryId?: number
}

interface UseVendorsOptions {
  enabled?: boolean
}

export function useVendors(
  params?: UseVendorsParams,
  { enabled = true }: UseVendorsOptions = {},
) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: () => vendorsApi.list(params),
    enabled,
  })
}
