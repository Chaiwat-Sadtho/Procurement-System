import { useQuery } from '@tanstack/react-query'
import { goodsReceiptsApi } from '../api'

export function useGoodsReceipt(id: number) {
  return useQuery({
    queryKey: ['goods-receipts', 'detail', id],
    queryFn: () => goodsReceiptsApi.get(id),
    enabled: id > 0,
  })
}
