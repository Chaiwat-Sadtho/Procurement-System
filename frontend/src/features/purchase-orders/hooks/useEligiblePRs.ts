import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { purchaseRequestsApi } from '@/features/purchase-requests/api'

// PRs that can still become a PO, for the create picker; the limit is raised so the Combobox never pages
const ELIGIBLE_PRS_PARAMS = { eligibleForPo: true, limit: 100 } as const

export function useEligiblePRs({ enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    queryKey: ['purchase-requests', { eligibleForPo: true }],
    queryFn: () => purchaseRequestsApi.list(ELIGIBLE_PRS_PARAMS),
    enabled,
  })
}
