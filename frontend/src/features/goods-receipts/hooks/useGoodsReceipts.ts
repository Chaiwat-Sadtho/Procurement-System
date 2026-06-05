import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { goodsReceiptsApi } from '../api'
import type { GRNListParams } from '../types'

export function useGoodsReceipts(
  params?: GRNListParams,
  { enabled = true }: QueryEnabledOptions = {},
) {
  return useQuery({
    queryKey: ['goods-receipts', 'list', params],
    queryFn: () => goodsReceiptsApi.list(params),
    enabled,
  })
}
